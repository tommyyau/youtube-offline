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
# For first-time setup or after code changes, use:
docker-compose up --build -d

# For subsequent starts (when no code has changed):
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
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

4. Run the application:
```bash
python enhanced_app.py
```

5. Access the application at `http://localhost:5001/enhanced`

## Troubleshooting

### Segmentation Fault During Installation

If you encounter a segmentation fault when installing dependencies:

```
segmentation fault  pip install -r requirements.txt
```

Try the following steps:

1. Create a new virtual environment:
```bash
python -m venv venv
source venv/bin/activate
```

2. Upgrade pip first:
```bash
python -m pip install --upgrade pip
```

3. Then install the requirements:
```bash
python -m pip install -r requirements.txt
```

### Port Already in Use

If you see an error about port 5000 being in use (common on macOS):

```
Address already in use
Port 5000 is in use by another program.
```

The application is now configured to use port 5001 by default. If you still encounter port issues:

1. On macOS, you may need to disable AirPlay Receiver:
   - Go to System Preferences -> General -> AirDrop & Handoff
   - Disable the 'AirPlay Receiver' service

2. Alternatively, you can modify the port in `enhanced_app.py` and `app.py` to use a different port.

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
# Always use --build when you've made code changes
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