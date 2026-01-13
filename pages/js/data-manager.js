/**
 * Campus Air Quality Monitor - Data Management Module
 * Provides CRUD operations for location data with ThingSpeak integration
 */

class LocationManager {
    constructor(storageKey = 'campus_locations') {
        this.storageKey = storageKey;
        this.defaultLocations = [];
        this.locations = this.loadLocations();
    }

    // Load locations from localStorage or use defaults
    loadLocations() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [...this.defaultLocations];
        } catch (error) {
            console.error('Error loading locations:', error);
            return [...this.defaultLocations];
        }
    }

    // Save locations to localStorage
    saveLocations() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.locations));
            return true;
        } catch (error) {
            console.error('Error saving locations:', error);
            return false;
        }
    }

    // CRUD Operations
    getAllLocations() {
        return [...this.locations];
    }

    getLocationById(id) {
        return this.locations.find(loc => loc.id === id);
    }

    createLocation(locationData) {
        const newLocation = {
            id: locationData.id || 'loc_' + Date.now(),
            name: locationData.name || 'Unnamed Location',
            channelId: locationData.channelId || '',
            readKey: locationData.readKey || '',
            lastUpdate: null
        };
        this.locations.push(newLocation);
        this.saveLocations();
        return newLocation;
    }

    updateLocation(id, updates) {
        const index = this.locations.findIndex(loc => loc.id === id);
        if (index >= 0) {
            this.locations[index] = { ...this.locations[index], ...updates };
            this.saveLocations();
            return this.locations[index];
        }
        return null;
    }

    deleteLocation(id) {
        const index = this.locations.findIndex(loc => loc.id === id);
        if (index >= 0) {
            const deleted = this.locations.splice(index, 1)[0];
            this.saveLocations();
            return deleted;
        }
        return null;
    }

    // Utility functions
    exportToJSON() {
        return JSON.stringify(this.locations, null, 2);
    }

    importFromJSON(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (Array.isArray(imported)) {
                this.locations = imported;
                this.saveLocations();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error importing locations:', error);
            return false;
        }
    }

    resetToDefaults() {
        this.locations = [...this.defaultLocations];
        this.saveLocations();
    }

    // Validation
    validateLocationData(data) {
        const errors = [];
        if (!data.name || data.name.trim().length === 0) {
            errors.push('Location name is required');
        }
        if (data.channelId && !/^\d+$/.test(data.channelId)) {
            errors.push('Channel ID must be numeric');
        }
        if (data.readKey && data.readKey.length < 16) {
            errors.push('Read API key appears to be too short');
        }
        return errors;
    }

    // Bulk operations
    createMultipleLocations(locationsArray) {
        const results = [];
        locationsArray.forEach(locData => {
            const errors = this.validateLocationData(locData);
            if (errors.length === 0) {
                results.push(this.createLocation(locData));
            } else {
                console.warn(`Skipping invalid location: ${errors.join(', ')}`);
            }
        });
        return results;
    }

    // Search and filter
    searchLocations(query) {
        const lowercaseQuery = query.toLowerCase();
        return this.locations.filter(loc =>
            loc.name.toLowerCase().includes(lowercaseQuery) ||
            loc.id.toLowerCase().includes(lowercaseQuery)
        );
    }

    getConfiguredLocations() {
        return this.locations.filter(loc => loc.channelId && loc.readKey);
    }

    getUnconfiguredLocations() {
        return this.locations.filter(loc => !loc.channelId || !loc.readKey);
    }
}

// Global instance for easy access
const locationManager = new LocationManager();

// Command-line style functions for direct use
function createLocation(name, channelId = '', readKey = '') {
    return locationManager.createLocation({ name, channelId, readKey });
}

function getLocation(id) {
    return locationManager.getLocationById(id);
}

function updateLocation(id, updates) {
    return locationManager.updateLocation(id, updates);
}

function deleteLocation(id) {
    return locationManager.deleteLocation(id);
}

function listLocations() {
    return locationManager.getAllLocations();
}

function exportLocations() {
    return locationManager.exportToJSON();
}

function importLocations(jsonString) {
    return locationManager.importFromJSON(jsonString);
}

// ThingSpeak integration helper
async function testThingSpeakConnection(channelId, readKey) {
    try {
        const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readKey}&results=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return {
            success: true,
            message: 'Connection successful',
            hasData: data.feeds && data.feeds.length > 0
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}

// Make functions available globally
window.LocationManager = LocationManager;
window.locationManager = locationManager;
window.createLocation = createLocation;
window.getLocation = getLocation;
window.updateLocation = updateLocation;
window.deleteLocation = deleteLocation;
window.listLocations = listLocations;
window.exportLocations = exportLocations;
window.importLocations = importLocations;
window.testThingSpeakConnection = testThingSpeakConnection;
