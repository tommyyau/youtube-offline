#!/bin/bash

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    echo "Visit https://docs.docker.com/get-docker/ for installation instructions."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit https://docs.docker.com/compose/install/ for installation instructions."
    exit 1
fi

# Create downloads directory if it doesn't exist
mkdir -p downloads

# Build and run the container
echo "Building and starting YouTube Offline Downloader..."
docker-compose up --build -d

echo "YouTube Offline Downloader is running!"
echo "Open your browser and go to: http://localhost:5001"
echo "Downloaded files will be saved in the 'downloads' directory."
echo ""
echo "To stop the application, run: docker-compose down" 