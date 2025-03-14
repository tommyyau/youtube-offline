#!/bin/bash

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Running setup first..."
    bash setup.sh
    exit 0
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Run the application
echo "Starting YouTube Offline Downloader..."
python enhanced_app.py

# Note: This line will only execute if the application is stopped
echo "Application stopped." 