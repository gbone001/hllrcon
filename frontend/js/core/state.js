// Application state management
// Centralized state for the entire application

export class AppState {
    // Private state properties
    static #connected = false;
    static #hostVisible = false;
    static #developerMode = false;
    static #mapList = [];
    static #lastExecutedCommand = null;

    // Connection state
    static get connected() {
        return this.#connected;
    }

    static setConnected(value) {
        this.#connected = value;
        this.#notifyStateChange('connected', value);
    }

    // Host visibility state
    static get hostVisible() {
        return this.#hostVisible;
    }

    static setHostVisible(value) {
        this.#hostVisible = value;
        this.#notifyStateChange('hostVisible', value);
    }

    // Developer mode state
    static get developerMode() {
        return this.#developerMode;
    }

    static setDeveloperMode(value) {
        this.#developerMode = value;
        this.#notifyStateChange('developerMode', value);
    }

    // Map list state
    static get mapList() {
        return [...this.#mapList]; // Return a copy to prevent external modification
    }

    static setMapList(value) {
        this.#mapList = Array.isArray(value) ? value : [];
        this.#notifyStateChange('mapList', this.#mapList);
    }

    // Last executed command state
    static get lastExecutedCommand() {
        return this.#lastExecutedCommand;
    }

    static setLastExecutedCommand(value) {
        this.#lastExecutedCommand = value;
        this.#notifyStateChange('lastExecutedCommand', value);
    }

    // State change notification system
    static #listeners = new Map();

    static addStateListener(key, callback) {
        if (!this.#listeners.has(key)) {
            this.#listeners.set(key, new Set());
        }
        this.#listeners.get(key).add(callback);
    }

    static removeStateListener(key, callback) {
        const listeners = this.#listeners.get(key);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.#listeners.delete(key);
            }
        }
    }

    static #notifyStateChange(key, value) {
        const listeners = this.#listeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error(`Error in state listener for ${key}:`, error);
                }
            });
        }
    }

    // Utility methods
    static toggleHostVisible() {
        this.setHostVisible(!this.#hostVisible);
    }

    static toggleDeveloperMode() {
        this.setDeveloperMode(!this.#developerMode);
    }

    // Get all state as an object (for debugging)
    static getState() {
        return {
            connected: this.#connected,
            hostVisible: this.#hostVisible,
            developerMode: this.#developerMode,
            mapList: [...this.#mapList],
            lastExecutedCommand: this.#lastExecutedCommand
        };
    }

    // Initialize state (can be called on app startup)
    static init() {
        // Reset all state to defaults
        this.#connected = false;
        this.#hostVisible = false;
        this.#developerMode = false;
        this.#mapList = [];
        this.#lastExecutedCommand = null;
        this.#listeners.clear();

        console.log('AppState initialized');
    }
}
