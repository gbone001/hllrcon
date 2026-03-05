// LocalStorage management service
// Handles all localStorage operations with proper error handling

import { APP_CONFIG } from '../core/config.js';

export class StorageService {
    // Theme management
    static getTheme() {
        try {
            const savedTheme = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME);
            // Default to dark theme unless explicitly set to light
            return savedTheme !== 'light' ? 'dark' : 'light';
        } catch (error) {
            console.warn('Error reading theme from localStorage:', error);
            return APP_CONFIG.DEFAULT_THEME;
        }
    }

    static setTheme(theme) {
        try {
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, theme);
            return true;
        } catch (error) {
            console.error('Error saving theme to localStorage:', error);
            return false;
        }
    }

    static isDarkTheme() {
        return this.getTheme() === 'dark';
    }

    // Developer mode management
    static getDeveloperMode() {
        try {
            const savedMode = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.DEVELOPER_MODE);
            return savedMode === 'true';
        } catch (error) {
            console.warn('Error reading developer mode from localStorage:', error);
            return APP_CONFIG.DEFAULT_DEVELOPER_MODE;
        }
    }

    static setDeveloperMode(enabled) {
        try {
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.DEVELOPER_MODE, enabled ? 'true' : 'false');
            return true;
        } catch (error) {
            console.error('Error saving developer mode to localStorage:', error);
            return false;
        }
    }

    // Generic localStorage helpers
    static get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (error) {
            console.warn(`Error reading ${key} from localStorage:`, error);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing ${key} from localStorage:`, error);
            return false;
        }
    }

    // JSON storage helpers
    static getJSON(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.warn(`Error parsing JSON for ${key} from localStorage:`, error);
            return defaultValue;
        }
    }

    static setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error saving JSON for ${key} to localStorage:`, error);
            return false;
        }
    }

    // Recent servers management
    static getRecentServers() {
        return this.getJSON(APP_CONFIG.STORAGE_KEYS.RECENT_SERVERS, []);
    }

    static addRecentServer({ host, port, password }) {
        const servers = this.getRecentServers();
        const key = `${host}:${port}`;
        const filtered = servers.filter(s => `${s.host}:${s.port}` !== key);
        filtered.unshift({ host, port, password });
        if (filtered.length > 10) filtered.length = 10;
        return this.setJSON(APP_CONFIG.STORAGE_KEYS.RECENT_SERVERS, filtered);
    }

    static removeRecentServer(host, port) {
        const servers = this.getRecentServers();
        const key = `${host}:${port}`;
        const filtered = servers.filter(s => `${s.host}:${s.port}` !== key);
        return this.setJSON(APP_CONFIG.STORAGE_KEYS.RECENT_SERVERS, filtered);
    }

    // Clear all stored data (useful for reset/debugging)
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    // Check if localStorage is available
    static isAvailable() {
        try {
            const test = 'localStorage-test';
            localStorage.setItem(test, 'test');
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.warn('localStorage is not available:', error);
            return false;
        }
    }

    // Get storage usage information
    static getStorageInfo() {
        if (!this.isAvailable()) {
            return { available: false };
        }

        try {
            let totalSize = 0;
            const keys = [];

            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const value = localStorage.getItem(key);
                    totalSize += key.length + (value ? value.length : 0);
                    keys.push(key);
                }
            }

            return {
                available: true,
                keys: keys,
                keyCount: keys.length,
                totalSize: totalSize,
                totalSizeKB: (totalSize / 1024).toFixed(2)
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { available: true, error: error.message };
        }
    }
}
