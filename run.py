#!/usr/bin/env python3

"""
Simple script to run the YouTube Offline Downloader application.
This script will check for required dependencies and install them if needed.
"""

import os
import sys
import subprocess

def check_dependency(package):
    """Check if a Python package is installed."""
    try:
        __import__(package)
        return True
    except ImportError:
        return False

def install_dependencies():
    """Install required dependencies."""
    dependencies = ['flask', 'flask_cors', 'yt_dlp', 'ffmpeg']
    missing = []
    
    for dep in dependencies:
        if not check_dependency(dep.replace('-', '_')):
            missing.append(dep)
    
    if missing:
        print(f"Installing missing dependencies: {', '.join(missing)}")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install'] + missing)
        except subprocess.CalledProcessError:
            print("Failed to install dependencies. Please install them manually:")
            print(f"pip install {' '.join(missing)}")
            sys.exit(1)

def run_app():
    """Run the application."""
    try:
        # Try to run the enhanced version first
        if os.path.exists('enhanced_app.py'):
            print("Running enhanced version...")
            os.system(f"{sys.executable} enhanced_app.py")
        else:
            print("Running basic version...")
            os.system(f"{sys.executable} app.py")
    except Exception as e:
        print(f"Error running application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("YouTube Offline Downloader")
    print("==========================")
    
    # Check and install dependencies
    install_dependencies()
    
    # Run the application
    run_app() 