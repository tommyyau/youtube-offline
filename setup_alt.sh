#!/bin/bash

echo "Setting up YouTube Offline Downloader (Alternative Method)..."

# Install dependencies directly
echo "Installing dependencies..."
pip3 install yt-dlp flask flask-cors ffmpeg-python

# Create required directories if they don't exist
echo "Creating required directories..."
mkdir -p static/css
mkdir -p static/js
mkdir -p templates

echo "Setup complete!"
echo "To start the application, run:"
echo "python3 enhanced_app.py" 