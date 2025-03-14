import os
import re
import json
import traceback
import random
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import tempfile
import yt_dlp

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Temporary storage for downloads
TEMP_DIR = tempfile.gettempdir()

# List of common desktop user agents to rotate
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11.5; rv:90.0) Gecko/20100101 Firefox/90.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
]

def get_random_user_agent():
    """Get a random user agent from the list"""
    return random.choice(USER_AGENTS)

def sanitize_filename(filename):
    """Remove invalid characters from filename"""
    return re.sub(r'[\\/*?:"<>|]', "", filename)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/enhanced')
def enhanced():
    return render_template('enhanced.html')

@app.route('/get_video_info', methods=['POST'])
def get_video_info():
    try:
        url = request.json.get('url')
        if not url:
            return jsonify({'error': 'No URL provided'}), 400
        
        print(f"Fetching info for URL: {url}")
        
        # Options for yt-dlp with enhanced protections
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'format': 'best',
            'youtube_include_dash_manifest': True,
            'nocheckcertificate': True,
            'ignoreerrors': True,
            'http_headers': {
                'User-Agent': get_random_user_agent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Sec-Fetch-Mode': 'navigate',
            }
        }
        
        # Extract information with yt-dlp
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            
            if not info_dict:
                return jsonify({'error': 'Could not fetch video information'}), 500
                
            # Get available formats
            formats = []
            
            # First collect best audio format for later merging
            best_audio = None
            for format_entry in info_dict.get('formats', []):
                if format_entry.get('vcodec') == 'none' and format_entry.get('acodec') != 'none':
                    if best_audio is None:
                        best_audio = format_entry
                    else:
                        # Safely compare audio bitrates with fallbacks to avoid NoneType comparison
                        format_abr = format_entry.get('abr')
                        best_abr = best_audio.get('abr')
                        
                        # Only compare if both values are numeric
                        if isinstance(format_abr, (int, float)) and isinstance(best_abr, (int, float)):
                            if format_abr > best_abr:
                                best_audio = format_entry
                        # If format has abr and best doesn't, prefer format
                        elif isinstance(format_abr, (int, float)):
                            best_audio = format_entry
            
            # Now process video formats
            for format_entry in info_dict.get('formats', []):
                # Skip formats without resolution or with only audio
                if 'height' not in format_entry or format_entry.get('vcodec') == 'none':
                    continue
                
                # Process only formats that have a reasonable chance of working
                if not format_entry.get('format_id') or not format_entry.get('ext'):
                    continue
                
                # Check if format has audio
                has_audio = format_entry.get('acodec') != 'none'
                
                # Get additional info like codec, bitrate
                vcodec = format_entry.get('vcodec', 'Unknown')
                codec_description = ''
                
                # Create more human-readable codec description
                if vcodec != 'Unknown':
                    if 'avc' in vcodec or 'h264' in vcodec:
                        codec_description = 'H.264'
                    elif 'av1' in vcodec:
                        codec_description = 'AV1'
                    elif 'vp9' in vcodec:
                        codec_description = 'VP9'
                    elif 'vp8' in vcodec:
                        codec_description = 'VP8'
                    else:
                        codec_description = vcodec.upper()
                
                # Calculate more accurate size based on filesize if available,
                # or fallback to bitrate calculation
                size_mb = 'Unknown'
                filesize = format_entry.get('filesize')
                
                if filesize:
                    size_mb = round(filesize / (1024 * 1024), 2)
                else:
                    # Calculate approx size in MB (bitrate * duration / 8 / 1024 / 1024)
                    duration = info_dict.get('duration', 0)
                    tbr = format_entry.get('tbr', 0)  # Total bitrate in kbps
                    
                    if duration and tbr:
                        size_mb = round((tbr * 1000 * duration) / (8 * 1024 * 1024), 2)
                
                # Determine final size if we need to add audio
                final_size_mb = size_mb
                if not has_audio and best_audio:
                    # Calculate audio size
                    audio_size = 0
                    audio_filesize = best_audio.get('filesize')
                    
                    if audio_filesize and isinstance(audio_filesize, (int, float)):
                        audio_size = audio_filesize / (1024 * 1024)
                    else:
                        duration = info_dict.get('duration', 0)
                        abr = best_audio.get('abr')
                        if duration and isinstance(duration, (int, float)) and abr and isinstance(abr, (int, float)):
                            audio_size = (abr * 1000 * duration) / (8 * 1024 * 1024)
                    
                    # If size_mb is a number, add audio size
                    if isinstance(size_mb, (int, float)) and audio_size > 0:
                        final_size_mb = round(size_mb + audio_size, 2)
                    elif not isinstance(size_mb, (int, float)) and audio_size > 0:
                        # If we only have audio size but no video size
                        final_size_mb = round(audio_size, 2)
                
                formats.append({
                    'format_id': format_entry.get('format_id'),
                    'resolution': f"{format_entry.get('height', 'Unknown')}p",
                    'extension': format_entry.get('ext', 'Unknown'),
                    'fps': format_entry.get('fps', 'Unknown'),
                    'vcodec': vcodec,
                    'codec_description': codec_description,
                    'bitrate': format_entry.get('tbr', 0),
                    'has_audio': has_audio,
                    'size_mb': size_mb,
                    'final_size_mb': final_size_mb
                })
            
            # Sort formats by resolution (highest first), then by codec quality
            try:
                formats = sorted(formats, 
                                key=lambda x: (
                                    int(x['resolution'].replace('p', '')) if x['resolution'] != 'Unknown' and 'p' in x['resolution'] else 0,
                                    x['bitrate'] if isinstance(x['bitrate'], (int, float)) else 0
                                ), 
                                reverse=True)
            except TypeError as e:
                print(f"Warning: Error sorting formats: {e}")
                # Fallback to simpler sorting if complex sorting fails
                try:
                    formats = sorted(formats, 
                                    key=lambda x: int(x['resolution'].replace('p', '')) if x['resolution'] != 'Unknown' and 'p' in x['resolution'] else 0, 
                                    reverse=True)
                except:
                    print("Warning: Could not sort formats by resolution, using original order")
            
            # Add audio-only option
            audio_formats = []
            for format_entry in info_dict.get('formats', []):
                if format_entry.get('vcodec') == 'none' and format_entry.get('acodec') != 'none':
                    # Calculate approx size
                    duration = info_dict.get('duration', 0)
                    abr = format_entry.get('abr', 0)  # Audio bitrate in kbps
                    
                    size_mb = 'Unknown'
                    filesize = format_entry.get('filesize')
                    
                    if filesize:
                        size_mb = round(filesize / (1024 * 1024), 2)
                    elif duration and abr:
                        size_mb = round((abr * 1000 * duration) / (8 * 1024 * 1024), 2)
                    
                    # Get audio codec
                    acodec = format_entry.get('acodec', 'Unknown')
                    audio_quality = f"{int(abr)}kbps" if isinstance(abr, (int, float)) and abr > 0 else 'Unknown'
                    
                    audio_formats.append({
                        'format_id': format_entry.get('format_id'),
                        'resolution': 'Audio only',
                        'extension': format_entry.get('ext', 'Unknown'),
                        'fps': 'N/A',
                        'acodec': acodec,
                        'audio_quality': audio_quality,
                        'has_audio': True,
                        'size_mb': size_mb,
                        'final_size_mb': size_mb
                    })
            
            # Sort audio formats by quality with better error handling
            try:
                audio_formats = sorted(audio_formats, 
                                    key=lambda x: float(x['format_id']) if x['format_id'] and x['format_id'].isdigit() else 0, 
                                    reverse=True)
            except (TypeError, ValueError) as e:
                print(f"Warning: Error sorting audio formats: {e}")
                # Don't sort if there's an error
            
            # Combine formats
            all_formats = formats + audio_formats
            
            if not all_formats:
                return jsonify({'error': 'No downloadable formats found for this video'}), 500
            
            video_info = {
                'title': info_dict.get('title', 'Unknown'),
                'uploader': info_dict.get('uploader', 'Unknown'),
                'duration': info_dict.get('duration', 0),
                'thumbnail': info_dict.get('thumbnail', ''),
                'formats': all_formats
            }
            
            print(f"Successfully retrieved video info: {video_info['title']}")
            return jsonify(video_info)
    
    except Exception as e:
        print(f"Error in get_video_info: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/download', methods=['POST'])
def download_video():
    try:
        url = request.json.get('url')
        format_id = request.json.get('format_id')
        
        if not url or not format_id:
            return jsonify({'error': 'URL and format ID are required'}), 400
        
        print(f"Downloading URL: {url}, format: {format_id}")
        
        # Sanitize the filename
        filename = None
        is_audio_only = False
        
        # First get video info to determine if format is audio-only
        with yt_dlp.YoutubeDL({
            'quiet': True, 
            'no_warnings': True, 
            'skip_download': True,
            'youtube_include_dash_manifest': True
        }) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            if not info_dict:
                return jsonify({'error': 'Could not fetch video information'}), 500
                
            title = info_dict.get('title', 'video')
            filename = sanitize_filename(title)
            
            # Check if the format is audio-only
            for format_entry in info_dict.get('formats', []):
                if format_entry.get('format_id') == format_id and format_entry.get('vcodec') == 'none':
                    is_audio_only = True
                    break
            
            # Also check if the selected format has audio already
            has_built_in_audio = False
            for format_entry in info_dict.get('formats', []):
                if format_entry.get('format_id') == format_id and format_entry.get('acodec') != 'none':
                    has_built_in_audio = True
                    break
        
        # Set up appropriate download options based on format type
        if is_audio_only:
            # For audio-only downloads
            output_template = os.path.join(TEMP_DIR, f"{filename}.%(ext)s")
            ydl_opts = {
                'format': format_id,
                'outtmpl': output_template,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'verbose': True  # Enable verbose output for debugging
            }
        else:
            # For video downloads
            output_template = os.path.join(TEMP_DIR, f"{filename}.%(ext)s")
            
            # If the format already has audio, use it directly
            # Otherwise, select the format and merge with best audio
            if has_built_in_audio:
                format_string = format_id
            else:
                format_string = f"{format_id}+bestaudio"
            
            ydl_opts = {
                'format': format_string,
                'outtmpl': output_template,
                'merge_output_format': 'mp4',
                'verbose': True,  # Enable verbose output for debugging
                # Force overwrite of existing files
                'overwrites': True,
                # Make sure FFmpeg knows to keep audio
                'postprocessor_args': {
                    'ffmpeg': ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k']
                }
            }
        
        # Perform the download
        print(f"Starting download with options: {ydl_opts}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        # Determine output file extension
        ext = 'mp3' if is_audio_only else 'mp4'
        expected_filename = f"{filename}.{ext}"
        file_path = os.path.join(TEMP_DIR, expected_filename)
        
        # If file doesn't exist with expected name, search for other possible names
        if not os.path.exists(file_path):
            print(f"File not found at expected path: {file_path}, searching for alternatives...")
            for file in os.listdir(TEMP_DIR):
                if file.startswith(filename):
                    expected_filename = file
                    file_path = os.path.join(TEMP_DIR, expected_filename)
                    print(f"Found alternative file: {file_path}")
                    break
        
        # Verify file exists and has a reasonable size
        if not os.path.exists(file_path):
            return jsonify({'error': 'Downloaded file not found'}), 500
        
        file_size = os.path.getsize(file_path)
        print(f"Download complete: {expected_filename}, size: {file_size / (1024*1024):.2f} MB")
        
        if file_size < 1024:  # If file is less than 1KB, it's probably corrupt
            return jsonify({'error': 'Download failed, file is empty or corrupt'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Download completed successfully',
            'download_path': f"/download_file?path={expected_filename}",
            'file_size_mb': round(file_size / (1024*1024), 2)
        })
    
    except Exception as e:
        print(f"Error in download_video: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/download_file', methods=['GET'])
def download_file():
    try:
        path = request.args.get('path')
        if not path:
            return jsonify({'error': 'No file path provided'}), 400
        
        file_path = os.path.join(TEMP_DIR, path)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Send the file as an attachment
        return send_file(file_path, as_attachment=True)
    
    except Exception as e:
        print(f"Error in download_file: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create directories if they don't exist
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    
    print("YouTube Offline Downloader starting...")
    app.run(debug=True, host='0.0.0.0', port=5001) 