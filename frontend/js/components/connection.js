// Connection management component
// Extracted from app.js lines 1983-2027

import { AppState } from '../core/state.js';
import { ApiService } from '../services/api.js';
import { ResponseComponent } from './response.js';
import { StorageService } from '../services/storage.js';

export class ConnectionComponent {
    // Update UI based on connection state
    // Updated to handle menu bar instead of commands header
    static updateUI(isConnected, data = {}) {
        AppState.setConnected(isConnected);
        const connectionBar = document.getElementById("connectionBar");
        const menuBar = document.getElementById("menuBar");
        const menuConnectionStatus = document.getElementById("menuConnectionStatus");

        if (isConnected) {
            const displayHost = AppState.hostVisible ? data.host : "•••.•••.•••.•••";

            // Show connection status in menu bar
            if (menuConnectionStatus) {
                menuConnectionStatus.innerHTML = `
                    <span class="connection-badge">
                        Connected to <span class="masked" onclick="toggleHostVisibility()" title="Click to ${AppState.hostVisible ? "hide" : "show"}">${displayHost}</span>:${data.port || ""}
                    </span>
                    <button class="disconnect-button" onclick="disconnect()">Disconnect</button>
                `;
            }

            // Hide connection bar and show menu bar
            if (connectionBar) {
                connectionBar.style.display = 'none';
            }
            if (menuBar) {
                menuBar.style.display = 'block';
            }

            // Add connected class to body for CSS styling
            document.body.classList.add('connected');
            this.enableCommandButtons(true);
        } else {
            // Clear menu bar connection status
            if (menuConnectionStatus) {
                menuConnectionStatus.innerHTML = '';
            }

            // Show connection bar and hide menu bar
            if (connectionBar) {
                connectionBar.style.display = 'block';
            }
            if (menuBar) {
                menuBar.style.display = 'none';
            }

            // Remove connected class from body
            document.body.classList.remove('connected');
            this.enableCommandButtons(false);
        }
    }

    // Toggle host visibility in connection status
    // Extracted from original toggleHostVisibility function (lines 1983-1986)
    static toggleHostVisibility() {
        AppState.toggleHostVisible();
        // Re-check status to refresh the UI
        this.checkStatus();
    }

    // Enable or disable command buttons based on connection state
    // Extracted from original enableCommandButtons function (lines 2021-2027)
    static enableCommandButtons(enabled) {
        const commandButtons = document.querySelectorAll('.command-button');
        commandButtons.forEach(button => {
            button.disabled = !enabled;
        });
    }

    // Connect to server
    static async connect() {
        const host = document.getElementById("host")?.value;
        const port = parseInt(document.getElementById("port")?.value);
        const password = document.getElementById("password")?.value;

        if (!host || !port || !password) {
            ResponseComponent.showError("Please fill in all fields");
            return;
        }

        ResponseComponent.showLoading(`Connecting to ${host}:${port}...`);

        try {
            const result = await ApiService.connect(host, port, password);

            if (result.success) {
                ResponseComponent.showSuccess(result.message, result.data);
                this.updateUI(true, { ...result.data, host, port });
                StorageService.addRecentServer({ host, port, password });
                this.renderRecentServers();
            } else {
                ResponseComponent.showError(result.error);
            }
        } catch (error) {
            ResponseComponent.showError(`Connection failed: ${error.message}`);
        }
    }

    // Disconnect from server
    static async disconnect() {
        try {
            const result = await ApiService.disconnect();

            if (result.success) {
                this.updateUI(false);
                ResponseComponent.showSuccess(result.message);
            } else {
                ResponseComponent.showError(result.error);
            }
        } catch (error) {
            ResponseComponent.showError(`Disconnect failed: ${error.message}`);
        }
    }

    // Check connection status
    static async checkStatus() {
        try {
            const result = await ApiService.checkStatus();
            this.updateUI(result.connected, result.data || {});
        } catch (error) {
            console.error('Status check failed:', error);
            this.updateUI(false);
        }
    }

    // Initialize connection component
    static init() {
        // Set up event listeners for connection form
        const connectBtn = document.getElementById('connectButton');
        const connectForm = document.getElementById('connectForm');

        if (connectBtn) {
            connectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.connect();
            });
        }

        if (connectForm) {
            connectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.connect();
            });
        }

        // Listen for state changes
        AppState.addStateListener('connected', (isConnected) => {
            this.enableCommandButtons(isConnected);
        });

        AppState.addStateListener('hostVisible', () => {
            // Trigger UI update when host visibility changes
            if (AppState.connected) {
                // We'll need to store connection data for this
                // For now, just refresh the status
                this.checkStatus();
            }
        });

        // Initialize recent servers UI
        this.initRecentServers();

        // Check initial status
        this.checkStatus();
    }

    // Recent servers
    static initRecentServers() {
        const connectForm = document.getElementById('connectForm');
        if (!connectForm) return;

        const connectFormGrid = connectForm.querySelector('.connect-form');
        if (!connectFormGrid) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'form-group recent-servers-wrapper';
        wrapper.innerHTML = `
            <button type="button" class="recent-servers-btn" id="recentServersBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Recent
            </button>
            <div class="recent-servers-dropdown" id="recentServersDropdown"></div>
        `;
        connectFormGrid.appendChild(wrapper);

        document.getElementById('recentServersBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleRecentServers();
        });

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('recentServersDropdown');
            if (dropdown && !wrapper.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        this.renderRecentServers();
    }

    static renderRecentServers() {
        const dropdown = document.getElementById('recentServersDropdown');
        if (!dropdown) return;

        const servers = StorageService.getRecentServers();
        if (servers.length === 0) {
            dropdown.innerHTML = '<div class="recent-servers-empty">No recent servers</div>';
            return;
        }

        dropdown.innerHTML = servers.map(s => `
            <div class="recent-server-item" data-host="${s.host}" data-port="${s.port}">
                <span>${s.host}:${s.port}</span>
                <button type="button" class="recent-server-delete" data-host="${s.host}" data-port="${s.port}" title="Remove">&times;</button>
            </div>
        `).join('') + '<div class="recent-servers-notice">Only visible to you. Stored in your browser.</div>';

        dropdown.querySelectorAll('.recent-server-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.recent-server-delete')) return;
                this.loadRecentServer(item.dataset.host, parseInt(item.dataset.port));
            });
        });

        dropdown.querySelectorAll('.recent-server-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteRecentServer(btn.dataset.host, parseInt(btn.dataset.port));
            });
        });
    }

    static toggleRecentServers() {
        const dropdown = document.getElementById('recentServersDropdown');
        if (dropdown) dropdown.classList.toggle('open');
    }

    static loadRecentServer(host, port) {
        const servers = StorageService.getRecentServers();
        const server = servers.find(s => s.host === host && s.port === port);
        if (!server) return;

        const hostInput = document.getElementById('host');
        const portInput = document.getElementById('port');
        const passwordInput = document.getElementById('password');

        if (hostInput) hostInput.value = server.host;
        if (portInput) portInput.value = server.port;
        if (passwordInput) passwordInput.value = server.password;

        document.getElementById('recentServersDropdown')?.classList.remove('open');
    }

    static deleteRecentServer(host, port) {
        StorageService.removeRecentServer(host, port);
        this.renderRecentServers();
    }

    // Clear connection form
    static clearForm() {
        const fields = ['host', 'port', 'password'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
    }

    // Validate connection form
    static validateForm() {
        const host = document.getElementById("host")?.value?.trim();
        const port = document.getElementById("port")?.value?.trim();
        const password = document.getElementById("password")?.value?.trim();

        const errors = [];

        if (!host) {
            errors.push("Host is required");
        }

        if (!port) {
            errors.push("Port is required");
        } else if (isNaN(parseInt(port)) || parseInt(port) <= 0 || parseInt(port) > 65535) {
            errors.push("Port must be a valid number between 1 and 65535");
        }

        if (!password) {
            errors.push("Password is required");
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Auto-connect if credentials are provided in URL parameters
    static autoConnectFromParams() {
        const params = new URLSearchParams(window.location.search);
        const host = params.get('host');
        const port = params.get('port');
        const password = params.get('password');

        if (host && port && password) {
            // Fill form fields
            const hostInput = document.getElementById("host");
            const portInput = document.getElementById("port");
            const passwordInput = document.getElementById("password");

            if (hostInput) hostInput.value = host;
            if (portInput) portInput.value = port;
            if (passwordInput) passwordInput.value = password;

            // Auto-connect after a short delay
            setTimeout(() => {
                this.connect();
            }, 500);
        }
    }
}

// Export the global functions for HTML onclick handlers
window.connect = () => ConnectionComponent.connect();
window.disconnect = () => ConnectionComponent.disconnect();
window.toggleHostVisibility = () => ConnectionComponent.toggleHostVisibility();
