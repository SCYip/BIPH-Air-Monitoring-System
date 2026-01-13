# Campus Air Quality Monitor

A modern web application for monitoring campus air quality using ThingSpeak integration.

## Features

- **Real-time Air Quality Monitoring**: CO2 levels and humidity tracking
- **Multiple Locations**: Support for multiple monitoring locations
- **ThingSpeak Integration**: Connects to ThingSpeak channels for data retrieval
- **Data Persistence**: Locations and configuration stored locally
- **Responsive Design**: Works on desktop and mobile devices
- **CRUD Operations**: Create, read, update, and delete location configurations

## Project Structure

```
campus-air-monitor/
├── app.py                        # Python Flask server (local development)
├── pages/
│   ├── index.html               # Home page with location selection
│   └── dashboard.html           # Dashboard page for monitoring
├── js/
│   └── data-manager.js          # Data management module with CRUD operations
├── data/
│   └── locations.json           # Location data storage
├── netlify.toml                 # Netlify deployment configuration
└── README.md                    # This documentation
```

## Setup

1. Open `index.html` in a web browser
2. Configure locations with ThingSpeak channel IDs and read API keys
3. Click on location cards to view real-time data

## ThingSpeak Configuration

Each location requires:
- **Channel ID**: Numeric ID of your ThingSpeak channel
- **Read API Key**: API key with read permissions

Data fields should be configured as:
- Field 1: CO2 level (ppm)
- Field 2: Humidity (%)

## JavaScript API

The `data-manager.js` file provides a comprehensive API for managing locations:

### LocationManager Class

```javascript
const manager = new LocationManager();

// CRUD Operations
manager.createLocation({ name: "New Location", channelId: "123", readKey: "abc" });
manager.getLocationById("loc_1");
manager.updateLocation("loc_1", { name: "Updated Name" });
manager.deleteLocation("loc_1");
manager.getAllLocations();

// Utility Functions
manager.exportToJSON(); // Export all locations as JSON
manager.importFromJSON(jsonString); // Import locations from JSON
manager.searchLocations("library"); // Search locations by name
manager.getConfiguredLocations(); // Get locations with valid config
```

### Global Functions

For convenience, these functions are also available globally:

```javascript
createLocation("Library", "123456", "API_KEY_HERE");
getLocation("loc_1");
updateLocation("loc_1", { name: "Main Library" });
deleteLocation("loc_1");
listLocations(); // Returns all locations
exportLocations(); // Export as JSON string
importLocations(jsonString); // Import from JSON string
```

### ThingSpeak Testing

```javascript
testThingSpeakConnection("123456", "API_KEY").then(result => {
    console.log(result.success); // true/false
    console.log(result.message); // Status message
    console.log(result.hasData); // Whether channel has data
});
```

## Keyboard Shortcuts

- `Esc` - Close settings modal
- `Ctrl+N` - Create new location
- `Ctrl+H` - Go back to home/map view

## Data Storage

- Locations are stored in browser localStorage as JSON
- Default locations are loaded from `locations.json` template
- Data persists between browser sessions

## Optimizations Added

- **Error Handling**: Comprehensive error handling for API calls and data operations
- **Loading States**: Visual feedback during data fetching
- **Form Validation**: Input validation for location configuration
- **Keyboard Shortcuts**: Improved accessibility and user experience
- **Modular Code**: Separated data management into reusable module
- **Better UX**: Loading indicators, status messages, and user guidance

## Prerequisites

Before running the application, install Flask:
```bash
pip install flask
```
or
```bash
pip3 install flask
```

## How to Run

### 🚀 Local Web Server (Recommended)

The application now runs on a local Flask web server for proper web application functionality.

#### Local Development (Flask)
```bash
python app.py
```
or
```bash
python3 app.py
```

### 🌐 Local Development

- **URL**: http://localhost:5000
- **Auto-opens**: Browser automatically opens when server starts
- **Stop**: Press `Ctrl+C` in terminal to stop the server

## 🚀 Deployment Options

### Netlify (Static Site)
1. Upload the entire project folder to Netlify
2. Netlify automatically uses `netlify.toml` configuration
3. The `pages/` folder serves as the website root

### Other Platforms
- **Heroku**: Deploy the Flask app (`app.py`)
- **Railway**: Python deployment with Flask
- **Render**: Free Flask hosting

### 📁 File Structure

The server serves files from the following routes:
- `/` - Home page (location selection)
- `/dashboard` - Dashboard page
- `/dashboard/<location>` - Dashboard with specific location
- `/js/<filename>` - JavaScript files
- `/data/<filename>` - Data files

### Manual Methods

#### Method 1: Direct File Opening
1. Navigate to your project folder
2. Double-click `index.html` to open in your default browser

#### Method 2: Browser Address Bar
Open your browser and enter: `file:///D:/Environmental%20Engineerig%20Club/AirMonitoringSystem/BIPH-Air-Monitoring-System/index.html`

### Navigation
- **Home Page** (`index.html`): Location selection and management
- **Dashboard** (`dashboard.html`): Individual location monitoring (accessed via location cards)

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript features
- localStorage API
- Fetch API
- CSS Grid and Flexbox

## Development

To extend the application:

1. Modify `data-manager.js` for additional data operations
2. Update `locations.json` to change default locations
3. Customize `index.html` styling and layout as needed

## License

This project is open source and available under the MIT License.
