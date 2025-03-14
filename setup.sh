#!/bin/bash

echo "Setting up YouTube Offline Downloader..."

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip first to avoid segmentation faults
echo "Upgrading pip..."
python -m pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
python -m pip install -r requirements.txt

# Create required directories if they don't exist
echo "Creating required directories..."
mkdir -p static/css
mkdir -p static/js
mkdir -p templates

echo "Setup complete!"
echo "To start the application, run:"
echo "source venv/bin/activate && python enhanced_app.py"
echo "Then access the application at http://localhost:5001/enhanced" 