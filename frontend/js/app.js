// Main application orchestrator
// Streamlined from the original 2200+ line app.js to ~150 lines

import { AppState } from './core/state.js';
import { ApiService } from './services/api.js';
import { ThemeComponent, DeveloperModeComponent } from './components/theme.js';
import { ConnectionComponent } from './components/connection.js';
import { CommandsComponent } from './components/commands.js';
import { ResponseComponent } from './components/response.js';
import { PlayersComponent } from './components/players.js';

class App {
    constructor() {
        console.log('HLL RCON Web Tool starting...');
    }

    // Initialize the application
    async init() {
        try {
            console.log('Initializing application...');

            // Initialize core systems first
            AppState.init();
            console.log('State initialized');

            // Initialize theme system early to prevent flash
            ThemeComponent.init();
            console.log('Theme system initialized');

            // Initialize developer mode
            DeveloperModeComponent.init();
            console.log('Developer mode initialized');

            // Initialize UI components
            ResponseComponent.init();
            console.log('Response component initialized');

            ConnectionComponent.init();
            console.log('Connection component initialized');

            // Load map data before initializing commands
            await CommandsComponent.loadMapList();
            console.log('Map list loaded');

            // Initialize commands component
            CommandsComponent.init();
            console.log('Commands component initialized');

            // Initialize players component
            PlayersComponent.init();
            console.log('Players component initialized');

            // Load version information
            await this.loadVersion();
            console.log('Version loaded');

            // Check initial connection status
            await ConnectionComponent.checkStatus();
            console.log('Connection status checked');

            // Check for auto-connect parameters
            ConnectionComponent.autoConnectFromParams();

            console.log('Application initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            ResponseComponent.showError('Failed to initialize application: ' + error.message);
        }
    }

    // Load version information and update UI
    async loadVersion() {
        try {
            const result = await ApiService.loadVersion();

            // Store version data globally for use by components
            window.appVersionData = result;

            // Update all version elements that exist
            const versionElements = ['appVersion', 'appVersionPlayers'];
            versionElements.forEach(elementId => {
                const versionEl = document.getElementById(elementId);
                if (versionEl) {
                    versionEl.textContent = result.version;
                    versionEl.href = result.githubUrl;
                    versionEl.title = result.title;
                }
            });

            const githubLinkEl = document.getElementById("githubLink");
            if (githubLinkEl) {
                githubLinkEl.href = result.githubUrl;
            }
        } catch (error) {
            console.error('Failed to load version:', error);
            // Non-critical error, don't show to user
        }
    }

    // Handle application errors
    handleError(error, context = '') {
        console.error(`App Error ${context}:`, error);
        ResponseComponent.showError(error.message || 'An unexpected error occurred', context);
    }

    // Handle unhandled promise rejections
    setupErrorHandlers() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled Promise Rejection');
            event.preventDefault();
        });

        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'Global Error');
        });
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    app.setupErrorHandlers();
    await app.init();
});

// Keep the application instance global for debugging
window.HLLRconApp = App;

console.log('HLL RCON Web Tool loaded - Modern ES6 Module Version');
