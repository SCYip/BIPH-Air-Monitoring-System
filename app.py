#!/usr/bin/env python3
"""
Campus Air Quality Monitor - Local Web Server
Runs the air quality monitoring web application on a local Flask server.
"""

import os
import sys
import webbrowser
import threading
import time
from pathlib import Path

# Check if Flask is available
try:
    from flask import Flask, send_from_directory
except ImportError:
    print("Error: Flask is required to run this application.")
    print("Install it with: pip install flask")
    sys.exit(1)

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Get the project root directory
    project_root = Path(__file__).parent

    @app.route('/')
    def index():
        """Serve the home page."""
        return send_from_directory(project_root / 'pages', 'index.html')

    @app.route('/dashboard')
    def dashboard():
        """Serve the dashboard page."""
        return send_from_directory(project_root / 'pages', 'dashboard.html')

    @app.route('/dashboard/<path:location>')
    def dashboard_with_location(location):
        """Serve the dashboard page with location parameter."""
        return send_from_directory(project_root / 'pages', 'dashboard.html')

    @app.route('/js/<path:filename>')
    def js_files(filename):
        """Serve JavaScript files."""
        return send_from_directory(project_root / 'js', filename)

    @app.route('/data/<path:filename>')
    def data_files(filename):
        """Serve data files."""
        return send_from_directory(project_root / 'data', filename)

    return app

def open_browser():
    """Open the browser after a short delay to let the server start."""
    time.sleep(1.5)  # Wait for server to start
    try:
        webbrowser.open('http://localhost:5000')
        print("Browser opened successfully!")
    except Exception as e:
        print(f"Could not open browser automatically: {e}")
        print("Please open http://localhost:5000 in your browser")

def main():
    """Main application entry point."""
    # Get the project root directory
    project_root = Path(__file__).parent

    # Check if required files exist
    required_files = ['pages/index.html', 'pages/dashboard.html', 'js/data-manager.js', 'data/locations.json']
    missing_files = []

    for file_path in required_files:
        full_path = project_root / file_path
        if not full_path.exists():
            missing_files.append(file_path)

    if missing_files:
        print("Error: Missing required files!")
        for file in missing_files:
            print(f"  - {file}")
        sys.exit(1)

    print("🌬️  Campus Air Quality Monitor")
    print("==============================")
    print("")
    print("Starting local web server...")
    print("Server will be available at: http://localhost:5000")
    print("")
    print("Navigation:")
    print("- Home Page: http://localhost:5000")
    print("- Dashboard: Click location cards to view real-time data")
    print("")
    print("Features:")
    print("- Real-time CO2 and humidity monitoring")
    print("- Add/edit/delete locations")
    print("- Historical data charts")
    print("- ThingSpeak API integration")
    print("")
    print("Press Ctrl+C to stop the server")
    print("")

    try:
        app = create_app()

        # Start browser in a separate thread
        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()

        # Start the Flask development server
        print("Starting server on http://localhost:5000...")
        app.run(host='localhost', port=5000, debug=False)

    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
        print("Thanks for using Campus Air Quality Monitor!")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
