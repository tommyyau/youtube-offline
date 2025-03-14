# YouTube Offline Downloader

A simple web application that allows you to download YouTube videos for offline viewing.

## Features

- Paste YouTube URL to get video information
- Select from available resolution and format options
- Download videos with audio (supports various codecs)
- Simple and intuitive interface
- Proper audio-video merging for all formats
- Detailed format information including codecs and sizes

## Screenshots

![YouTube Offline Downloader](https://via.placeholder.com/800x400?text=YouTube+Offline+Downloader)

## Technologies Used

- **Backend**: Python, Flask, yt-dlp
- **Frontend**: HTML, CSS, JavaScript
- **Containerization**: Docker, Docker Compose

## Installation Options

### Option 1: Using Docker (Recommended)

1. Clone this repository:
```bash
git clone https://github.com/tommyyau/youtube-offline.git
cd youtube-offline
```

2. Build and start the container:
```bash
docker-compose up -d
```

3. Access the application at `http://localhost:5001/enhanced`

### Option 2: Local Installation

1. Clone this repository:
```bash
git clone https://github.com/tommyyau/youtube-offline.git
cd youtube-offline
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install required packages:
```bash
pip install -r requirements.txt
```

4. Run the application:
```bash
python enhanced_app.py
```

5. Access the application at `http://localhost:5000/enhanced`

## Future Enhancements

Ideas for future improvements:
- Add playlist download support
- Implement user-configurable download location
- Add subtitle download options
- Improve error handling and retry mechanisms
- Add thumbnail preview before download

## Making Changes

To make enhancements to this project:

1. Make your code changes
2. If using Docker, rebuild and restart:
```bash
docker-compose down
docker-compose up --build -d
```

3. If running locally, just restart the application:
```bash
python enhanced_app.py
```

## Disclaimer

This tool is for educational purposes only. Please be aware that downloading YouTube videos may violate YouTube's Terms of Service. Only download videos that you have permission to download or that are in the public domain.

## License

MIT 