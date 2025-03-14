document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const videoUrlInput = document.getElementById('video-url');
    const fetchBtn = document.getElementById('fetch-btn');
    const loadingElement = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const videoInfoElement = document.getElementById('video-info');
    const videoThumbnail = document.getElementById('video-thumbnail');
    const videoTitle = document.getElementById('video-title');
    const videoAuthor = document.getElementById('video-author');
    const videoDuration = document.getElementById('video-duration');
    const streamsTable = document.getElementById('streams-table');
    const downloadProgress = document.getElementById('download-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    
    // Event Listeners
    fetchBtn.addEventListener('click', fetchVideoInfo);
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchVideoInfo();
        }
    });
    
    // Functions
    function fetchVideoInfo() {
        const url = videoUrlInput.value.trim();
        
        if (!url) {
            showError('Please enter a YouTube URL');
            return;
        }
        
        if (!isValidYouTubeUrl(url)) {
            showError('Invalid YouTube URL');
            return;
        }
        
        showLoading();
        hideError();
        hideVideoInfo();
        hideDownloadProgress();
        
        fetch('/get_video_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to fetch video information');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            displayVideoInfo(data);
            hideLoading();
        })
        .catch(error => {
            hideLoading();
            showError(error.message);
            console.error('Error fetching video info:', error);
        });
    }
    
    function displayVideoInfo(data) {
        try {
            // Set video details
            videoThumbnail.src = data.thumbnail || '';
            videoTitle.textContent = data.title || 'Unknown Title';
            videoAuthor.textContent = data.uploader || 'Unknown Author';
            videoDuration.textContent = formatDuration(data.duration || 0);
            
            // Clear previous streams
            streamsTable.innerHTML = '';
            
            // Check if formats exist and is an array
            if (!data.formats || !Array.isArray(data.formats) || data.formats.length === 0) {
                throw new Error('No download formats available');
            }
            
            // Add streams to table
            data.formats.forEach(format => {
                const row = document.createElement('tr');
                
                // Update audio indicator - Always show audio icon for video formats
                let hasAudio;
                if (format.resolution === 'Audio only') {
                    hasAudio = '<i class="fas fa-volume-up text-success" title="Audio only"></i>';
                } else {
                    // All video formats will have audio merged during download
                    hasAudio = '<i class="fas fa-volume-up text-success" title="Video with audio"></i>';
                }
                
                // Format description (codec + extension)
                let formatDescription;
                if (format.resolution === 'Audio only') {
                    formatDescription = `${format.extension} (${format.audio_quality || 'Unknown quality'}) ${hasAudio}`;
                } else {
                    // Include codec info for video formats to explain size difference
                    formatDescription = `${format.extension} - ${format.codec_description || format.vcodec || 'Unknown codec'} ${hasAudio}`;
                }
                
                // Display the final size that includes merged audio if needed
                const sizeDisplay = typeof format.final_size_mb === 'number' ? 
                    `${format.final_size_mb} MB` : 
                    (format.final_size_mb || 'Unknown size');
                
                row.innerHTML = `
                    <td>${format.resolution || 'Unknown'}</td>
                    <td>${formatDescription}</td>
                    <td>${format.fps || 'N/A'}</td>
                    <td>${sizeDisplay}</td>
                    <td>
                        <button class="download-btn" data-format-id="${format.format_id}">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </td>
                `;
                
                streamsTable.appendChild(row);
                
                // Add download event listener
                const downloadBtn = row.querySelector('.download-btn');
                downloadBtn.addEventListener('click', () => {
                    downloadVideo(format.format_id);
                });
            });
            
            showVideoInfo();
        } catch (error) {
            showError(error.message);
            console.error('Error displaying video info:', error);
        }
    }
    
    function downloadVideo(format_id) {
        try {
            const url = videoUrlInput.value.trim();
            
            hideVideoInfo();
            showDownloadProgress();
            
            // Set initial progress
            updateProgressBar(10);
            progressStatus.textContent = 'Preparing download...';
            
            fetch('/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, format_id }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Failed to download video');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                
                updateProgressBar(100);
                
                // Include file size in the success message if available
                if (data.file_size_mb) {
                    progressStatus.textContent = `Download complete (${data.file_size_mb} MB)! Starting file download...`;
                } else {
                    progressStatus.textContent = 'Download complete! Starting file download...';
                }
                
                // Trigger file download
                window.location.href = data.download_path;
                
                // Show video info again after a delay
                setTimeout(() => {
                    hideDownloadProgress();
                    showVideoInfo();
                }, 3000);
            })
            .catch(error => {
                hideDownloadProgress();
                showError(error.message);
                console.error('Error downloading video:', error);
            });
        } catch (error) {
            hideDownloadProgress();
            showError(error.message);
            console.error('Error in download function:', error);
        }
    }
    
    // Helper Functions
    function isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        return youtubeRegex.test(url);
    }
    
    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return [
            hours > 0 ? hours : null,
            minutes,
            secs
        ]
            .filter(Boolean)
            .map(unit => unit.toString().padStart(2, '0'))
            .join(':');
    }
    
    function updateProgressBar(percentage) {
        progressBar.style.width = `${percentage}%`;
    }
    
    function showLoading() {
        loadingElement.classList.remove('hidden');
    }
    
    function hideLoading() {
        loadingElement.classList.add('hidden');
    }
    
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
    }
    
    function hideError() {
        errorMessage.classList.add('hidden');
    }
    
    function showVideoInfo() {
        videoInfoElement.classList.remove('hidden');
    }
    
    function hideVideoInfo() {
        videoInfoElement.classList.add('hidden');
    }
    
    function showDownloadProgress() {
        downloadProgress.classList.remove('hidden');
    }
    
    function hideDownloadProgress() {
        downloadProgress.classList.add('hidden');
    }
}); 