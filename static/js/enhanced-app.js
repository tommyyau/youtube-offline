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
    const downloadSpeed = document.getElementById('download-speed');
    const downloadSize = document.getElementById('download-size');
    const downloadEta = document.getElementById('download-eta');
    
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
            updateProgressBar(5);
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
                
                // Start polling for progress updates
                const videoId = data.video_id;
                const filename = data.filename;
                
                if (videoId) {
                    // Start progress polling
                    pollDownloadProgress(videoId, filename);
                } else {
                    throw new Error('No video ID returned from server');
                }
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
    
    // Function to poll for download progress
    function pollDownloadProgress(videoId, filename) {
        // Clear any existing interval
        if (window.progressInterval) {
            clearInterval(window.progressInterval);
        }
        
        // Set up polling interval (check every 500ms)
        window.progressInterval = setInterval(() => {
            fetch(`/check_download_status?video_id=${videoId}&filename=${filename}`)
                .then(response => response.json())
                .then(data => {
                    // Update progress bar
                    if (data.percent) {
                        updateProgressBar(data.percent);
                    }
                    
                    // Update status message
                    if (data.status === 'downloading') {
                        // Format speed and ETA if available
                        let statusText = 'Downloading...';
                        
                        if (data.speed && data.speed > 0) {
                            const speedMB = (data.speed / (1024 * 1024)).toFixed(2);
                            statusText += ` ${speedMB} MB/s`;
                            downloadSpeed.textContent = `Speed: ${speedMB} MB/s`;
                        } else {
                            downloadSpeed.textContent = 'Speed: Calculating...';
                        }
                        
                        if (data.eta && data.eta > 0) {
                            const minutes = Math.floor(data.eta / 60);
                            const seconds = data.eta % 60;
                            statusText += `, ETA: ${minutes}m ${seconds}s`;
                            downloadEta.textContent = `ETA: ${minutes}m ${seconds}s`;
                        } else {
                            downloadEta.textContent = 'ETA: Calculating...';
                        }
                        
                        if (data.downloaded_bytes && data.total_bytes) {
                            const downloadedMB = (data.downloaded_bytes / (1024 * 1024)).toFixed(2);
                            const totalMB = (data.total_bytes / (1024 * 1024)).toFixed(2);
                            statusText += ` (${downloadedMB}/${totalMB} MB)`;
                            downloadSize.textContent = `${downloadedMB}/${totalMB} MB`;
                        } else {
                            downloadSize.textContent = 'Size: Calculating...';
                        }
                        
                        progressStatus.textContent = statusText;
                    } else if (data.status === 'processing') {
                        progressStatus.textContent = 'Processing video...';
                        downloadSpeed.textContent = 'Processing...';
                        downloadEta.textContent = 'Almost done';
                        downloadSize.textContent = 'Finalizing file';
                    } else if (data.status === 'complete') {
                        // Download is complete
                        updateProgressBar(100);
                        
                        // Include file size in the success message if available
                        if (data.file_size_mb) {
                            progressStatus.textContent = `Download complete (${data.file_size_mb} MB)! Starting file download...`;
                            downloadSize.textContent = `Total: ${data.file_size_mb} MB`;
                        } else {
                            progressStatus.textContent = 'Download complete! Starting file download...';
                            downloadSize.textContent = 'Download complete';
                        }
                        
                        downloadSpeed.textContent = 'Complete';
                        downloadEta.textContent = 'Ready';
                        
                        // Clear the interval
                        clearInterval(window.progressInterval);
                        
                        // Trigger file download
                        if (data.download_path) {
                            window.location.href = data.download_path;
                            
                            // Show video info again after a delay
                            setTimeout(() => {
                                hideDownloadProgress();
                                showVideoInfo();
                            }, 3000);
                        }
                    } else if (data.status === 'error') {
                        // Handle error
                        clearInterval(window.progressInterval);
                        hideDownloadProgress();
                        showError(data.error || 'Download failed');
                    }
                })
                .catch(error => {
                    console.error('Error polling for progress:', error);
                });
        }, 500);
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