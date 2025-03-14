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
                throw new Error('Failed to fetch video information');
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
        });
    }
    
    function displayVideoInfo(data) {
        // Set video details
        videoThumbnail.src = data.thumbnail_url;
        videoTitle.textContent = data.title;
        videoAuthor.textContent = data.author;
        videoDuration.textContent = formatDuration(data.length);
        
        // Clear previous streams
        streamsTable.innerHTML = '';
        
        // Add streams to table
        data.streams.forEach(stream => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${stream.resolution}</td>
                <td>${stream.mime_type}</td>
                <td>${stream.fps}</td>
                <td>${stream.size_mb} MB</td>
                <td>
                    <button class="download-btn" data-itag="${stream.itag}">
                        <i class="fas fa-download"></i> Download
                    </button>
                </td>
            `;
            
            streamsTable.appendChild(row);
            
            // Add download event listener
            const downloadBtn = row.querySelector('.download-btn');
            downloadBtn.addEventListener('click', () => {
                downloadVideo(stream.itag);
            });
        });
        
        showVideoInfo();
    }
    
    function downloadVideo(itag) {
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
            body: JSON.stringify({ url, itag }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to download video');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            updateProgressBar(100);
            progressStatus.textContent = 'Download complete! Starting file download...';
            
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
        });
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