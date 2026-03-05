// Theme and developer mode management component
// Extracted from app.js lines 6-98

import { StorageService } from '../services/storage.js';
import { AppState } from '../core/state.js';

export class ThemeComponent {
    // Toggle between light and dark themes
    // Extracted from original toggleTheme function (lines 59-78)
    static toggleTheme() {
        const body = document.body;
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');

        body.classList.toggle('dark-theme');
        const isDark = body.classList.contains('dark-theme');

        // Toggle icons
        if (isDark) {
            if (sunIcon) sunIcon.classList.add('hidden');
            if (moonIcon) moonIcon.classList.remove('hidden');
        } else {
            if (sunIcon) sunIcon.classList.remove('hidden');
            if (moonIcon) moonIcon.classList.add('hidden');
        }

        // Save preference
        StorageService.setTheme(isDark ? 'dark' : 'light');
    }

    // Load theme preference on startup
    // Extracted from original loadThemePreference function (lines 81-98)
    static loadThemePreference() {
        const shouldUseDark = StorageService.isDarkTheme();
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');

        if (!shouldUseDark) {
            // Only modify if light theme is preferred
            document.body.classList.remove('dark-theme');
            if (sunIcon && moonIcon) {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        } else {
            // Ensure dark theme is applied
            document.body.classList.add('dark-theme');
            if (sunIcon && moonIcon) {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            }
        }
    }

    // Initialize theme system
    static init() {
        // Load theme as early as possible to avoid flash
        this.loadThemePreference();

        // Set up theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }
}

export class DeveloperModeComponent {
    // Toggle developer mode
    // Extracted from original toggleDeveloperMode function (lines 6-35)
    static toggleDeveloperMode() {
        console.log('toggleDeveloperMode called, current mode:', AppState.developerMode);

        const newMode = !AppState.developerMode;
        AppState.setDeveloperMode(newMode);

        console.log('Developer mode toggled to:', newMode);

        // Save preference
        const saved = StorageService.setDeveloperMode(newMode);
        console.log('Saved to localStorage:', saved ? 'success' : 'failed');

        // Update button UI
        const button = document.getElementById('devModeToggle');
        console.log('Button element found:', button);
        if (button) {
            if (newMode) {
                button.classList.add('active');
                console.log('Added active class to button');
            } else {
                button.classList.remove('active');
                console.log('Removed active class from button');
            }
            console.log('Button classes:', button.className);
        }

        // Rebuild commands UI
        console.log('About to reinitialize commands...');
        this.reinitializeCommands();
        console.log('Commands reinitialized');
    }

    // Load developer mode preference on startup
    // Extracted from original loadDeveloperModePreference function (lines 38-56)
    static loadDeveloperModePreference() {
        const savedMode = StorageService.getDeveloperMode();
        AppState.setDeveloperMode(savedMode);

        console.log('Loaded developer mode preference:', savedMode);

        // Update button UI
        const button = document.getElementById('devModeToggle');
        if (button) {
            if (savedMode) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
            console.log('Developer mode button set to:', savedMode);
        } else {
            console.warn('Developer mode button not found in DOM');
        }
    }

    // Reinitialize commands when developer mode changes
    // This will be implemented by the commands component
    static reinitializeCommands() {
        // This method will be called by the commands component
        // We'll trigger a custom event for loose coupling
        const event = new CustomEvent('developerModeChanged', {
            detail: { developerMode: AppState.developerMode }
        });
        document.dispatchEvent(event);
    }

    // Initialize developer mode system
    static init() {
        // Load developer mode preference
        this.loadDeveloperModePreference();

        // Listen for state changes to update UI
        AppState.addStateListener('developerMode', (newValue) => {
            this.updateButtonState(newValue);
        });
    }

    // Update button state based on developer mode
    static updateButtonState(developerMode) {
        const button = document.getElementById('devModeToggle');
        if (button) {
            if (developerMode) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }
}

// Export the global functions for HTML onclick handlers
window.toggleTheme = () => ThemeComponent.toggleTheme();
window.toggleDeveloperMode = () => DeveloperModeComponent.toggleDeveloperMode();
