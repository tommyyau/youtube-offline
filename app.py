import os
import re
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
from pytube import YouTube
import tempfile

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Temporary storage for downloads
TEMP_DIR = tempfile.gettempdir()

def sanitize_filename(filename):
    """Remove invalid characters from filename"""
    return re.sub(r'[\\/*?:"<>|]', "", filename)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_video_info', methods=['POST'])
def get_video_info():
    try:
        url = request.json.get('url')
        if not url:
            return jsonify({'error': 'No URL provided'}), 400
        
        # Create a YouTube object
        yt = YouTube(url)
        
        # Get available streams (both progressive and adaptive)
        streams = yt.streams.filter(progressive=True).order_by('resolution').desc()
        
        # Add audio-only option
        audio_stream = yt.streams.filter(only_audio=True).first()
        
        # Extract information
        streams_info = []
        
        for stream in streams:
            streams_info.append({
                'itag': stream.itag,
                'resolution': stream.resolution,
                'mime_type': stream.mime_type,
                'fps': stream.fps,
                'size_mb': round(stream.filesize / (1024 * 1024), 2)
            })
            
        if audio_stream:
            streams_info.append({
                'itag': audio_stream.itag,
                'resolution': 'Audio only',
                'mime_type': audio_stream.mime_type,
                'fps': 'N/A',
                'size_mb': round(audio_stream.filesize / (1024 * 1024), 2)
            })
        
        video_info = {
            'title': yt.title,
            'author': yt.author,
            'length': yt.length,
            'thumbnail_url': yt.thumbnail_url,
            'streams': streams_info
        }
        
        return jsonify(video_info)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download', methods=['POST'])
def download_video():
    try:
        url = request.json.get('url')
        itag = request.json.get('itag')
        
        if not url or not itag:
            return jsonify({'error': 'URL and itag are required'}), 400
        
        # Convert itag to integer
        itag = int(itag)
        
        # Create a YouTube object
        yt = YouTube(url)
        
        # Get the specific stream by itag
        stream = yt.streams.get_by_itag(itag)
        
        if not stream:
            return jsonify({'error': 'Selected stream not available'}), 400
        
        # Create a sanitized filename
        filename = sanitize_filename(yt.title)
        
        if stream.includes_video_track:
            extension = stream.mime_type.split('/')[-1]
        else:
            extension = 'mp3'  # For audio-only streams
        
        output_path = os.path.join(TEMP_DIR, f"{filename}.{extension}")
        
        # Download the stream
        stream.download(output_path=TEMP_DIR, filename=f"{filename}.{extension}")
        
        return jsonify({
            'success': True,
            'message': 'Download completed successfully',
            'download_path': f"/download_file?path={filename}.{extension}"
        })
    
    except Exception as e:
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
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create directories if they don't exist
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    
    app.run(debug=True, host='0.0.0.0') 