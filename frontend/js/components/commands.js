// Commands management component
// Extracted from app.js lines 1535-1764, 1766-1780, 1867-1916, 2188-2208

import { developerCommands, userFriendlyCommands } from '../core/config.js';
import { AppState } from '../core/state.js';
import { ApiService } from '../services/api.js';
import { ResponseComponent } from './response.js';
import { FormattingUtils } from '../utils/formatting.js';

export class CommandsComponent {
    // Get active command set based on developer mode
    // Extracted from original getActiveCommands function (lines 1535-1539)
    static getActiveCommands() {
        const activeCommands = AppState.developerMode ? developerCommands : userFriendlyCommands;
        console.log('Active command set:', AppState.developerMode ? 'Developer' : 'User-Friendly', 'Groups:', Object.keys(activeCommands));
        return activeCommands;
    }

    // Initialize/render commands UI
    // Extracted from original initializeCommands function (lines 1550-1764)
    static initializeCommands() {
        const container = document.getElementById("commandsList");
        if (!container) {
            console.error('Commands list container not found');
            return;
        }

        const activeCommands = this.getActiveCommands();

        for (const [section, cmds] of Object.entries(activeCommands)) {
            const sectionDiv = document.createElement("div");
            sectionDiv.className = "command-section";

            const sectionTitle = document.createElement("h3");
            sectionTitle.textContent = section;
            sectionDiv.appendChild(sectionTitle);

            cmds.forEach((cmd, idx) => {
                const cmdId = `cmd-${section.replace(/\s+/g, "-")}-${idx}`;
                const item = document.createElement("div");
                item.className = "command-item";

                const header = document.createElement("div");
                header.className = "command-header";

                const headerTop = document.createElement("div");
                headerTop.className = "command-header-top";

                const titleWrapper = document.createElement("div");
                titleWrapper.className = "command-title-wrapper";

                const title = document.createElement("span");
                title.className = "command-title";
                title.textContent = cmd.name;

                titleWrapper.appendChild(title);

                // In user-friendly mode, show description in header
                if (cmd.description && !AppState.developerMode) {
                    const desc = document.createElement("span");
                    desc.className = "command-description";
                    desc.textContent = cmd.description;
                    titleWrapper.appendChild(desc);
                }

                headerTop.appendChild(titleWrapper);

                // Only show method badge in developer mode
                if (AppState.developerMode) {
                    const method = document.createElement("span");
                    method.className = `command-method method-${cmd.method.toLowerCase()}`;
                    method.textContent = cmd.method;
                    headerTop.appendChild(method);
                }

                header.appendChild(headerTop);

                // All commands are expandable
                header.onclick = () => this.toggleCommandBody(cmdId);

                const body = document.createElement("div");
                body.className = "command-body";
                body.id = cmdId;

                // In developer mode, show description in body
                if (cmd.description && AppState.developerMode) {
                    const desc = document.createElement("p");
                    desc.style.cssText = "margin-bottom: 15px; color: #adadad; font-size: 13px; font-style: italic;";
                    desc.textContent = cmd.description;
                    body.appendChild(desc);
                }

                if (cmd.fields && cmd.fields.length > 0) {
                    cmd.fields.forEach((field) => {
                        const formGroup = document.createElement("div");
                        formGroup.className = "form-group";
                        formGroup.id = `${cmdId}-${field.name}-group`;

                        // Hide conditional fields by default
                        if (field.conditional) {
                            formGroup.style.display = "none";
                        }

                        const label = document.createElement("label");
                        const labelText = FormattingUtils.formatFieldName(field.name);
                        label.textContent = labelText;

                        formGroup.appendChild(label);

                        if (field.type === "select") {
                            const select = document.createElement("select");
                            select.id = `${cmdId}-${field.name}`;

                            // Add placeholder option
                            if (field.placeholder) {
                                const placeholderOption = document.createElement("option");
                                placeholderOption.value = "";
                                placeholderOption.textContent = field.placeholder;
                                placeholderOption.disabled = true;
                                placeholderOption.selected = true;
                                select.appendChild(placeholderOption);
                            }

                            // Add options
                            if (field.options && field.options.length > 0) {
                                field.options.forEach((opt) => {
                                    const option = document.createElement("option");
                                    // Support both string options and {value, label} objects
                                    if (typeof opt === "object") {
                                        option.value = opt.value;
                                        option.textContent = opt.label;
                                    } else {
                                        option.value = opt;
                                        option.textContent = opt;
                                    }
                                    select.appendChild(option);
                                });
                            }

                            // Handle conditional fields
                            if (field.conditionalFor) {
                                select.addEventListener("change", (e) => {
                                    const conditionalFieldId = `${cmdId}-${field.conditionalFor}-group`;
                                    const conditionalGroup = document.getElementById(conditionalFieldId);
                                    if (conditionalGroup) {
                                        if (field.showWhen && field.showWhen.includes(e.target.value)) {
                                            conditionalGroup.style.display = "block";
                                        } else {
                                            conditionalGroup.style.display = "none";
                                        }
                                    }
                                });
                            }

                            formGroup.appendChild(select);
                        } else if (field.type === "textarea") {
                            const textarea = document.createElement("textarea");
                            textarea.id = `${cmdId}-${field.name}`;
                            textarea.placeholder = field.placeholder || "";
                            textarea.rows = 3;
                            formGroup.appendChild(textarea);
                        } else if (field.type === "checkbox") {
                            const checkbox = document.createElement("input");
                            checkbox.type = "checkbox";
                            checkbox.id = `${cmdId}-${field.name}`;
                            checkbox.checked = field.default || false;
                            formGroup.appendChild(checkbox);
                        } else {
                            // Check if this is a map-related field
                            const isMapField = field.name === "map_name" || field.name === "map_id";

                            if (isMapField) {
                                // Create a select dropdown for maps
                                const select = document.createElement("select");
                                select.id = `${cmdId}-${field.name}`;

                                // Add placeholder option
                                const placeholderOption = document.createElement("option");
                                placeholderOption.value = "";
                                placeholderOption.textContent = field.placeholder || "Select a map...";
                                placeholderOption.disabled = true;
                                placeholderOption.selected = true;
                                select.appendChild(placeholderOption);

                                // Add map options (will be populated after maps are loaded)
                                const mapList = AppState.mapList;
                                if (mapList.length > 0) {
                                    mapList.forEach(map => {
                                        const option = document.createElement("option");
                                        option.value = map;
                                        option.textContent = FormattingUtils.formatMapName(map);
                                        select.appendChild(option);
                                    });
                                } else {
                                    // Maps will be loaded, mark this select for later population
                                    select.classList.add("map-select-pending");
                                }

                                formGroup.appendChild(select);
                            } else {
                                const input = document.createElement("input");
                                input.type = field.type || "text";
                                input.id = `${cmdId}-${field.name}`;
                                input.placeholder = field.placeholder || "";
                                formGroup.appendChild(input);
                            }
                        }

                        body.appendChild(formGroup);
                    });
                }

                // Add send button (full width, centered)
                const btnWrapper = document.createElement("div");
                btnWrapper.className = "command-button-wrapper";
                const btn = document.createElement("button");
                btn.className = "command-button";
                btn.textContent = "Send Command";
                btn.onclick = () =>
                    cmd.fields && cmd.fields.length > 0
                        ? this.executeCommandWithForm(cmd, cmdId)
                        : this.executeCommand(cmd);
                btnWrapper.appendChild(btn);
                body.appendChild(btnWrapper);

                item.appendChild(body);
                item.insertBefore(header, item.firstChild);
                sectionDiv.appendChild(item);
            });

            container.appendChild(sectionDiv);
        }
    }

    // Toggle command body expansion
    // Extracted from original toggleCommandBody function (lines 1766-1780)
    static toggleCommandBody(id) {
        const body = document.getElementById(id);
        if (!body) return;

        const isCurrentlyExpanded = body.classList.contains("expanded");

        // Close all command bodies
        const allCommandBodies = document.querySelectorAll('.command-body');
        allCommandBodies.forEach(cmdBody => {
            cmdBody.classList.remove("expanded");
        });

        // If the clicked command wasn't expanded, expand it
        if (!isCurrentlyExpanded) {
            body.classList.add("expanded");
        }
    }

    // Execute command with form data
    // Extracted from original executeCommandWithForm function (lines 1867-1916)
    static executeCommandWithForm(cmd, cmdId) {
        if (!AppState.connected) {
            ResponseComponent.showError("Not connected to server");
            return;
        }

        const bodyData = {};
        let hasError = false;

        if (cmd.fields) {
            cmd.fields.forEach((field) => {
                const elem = document.getElementById(`${cmdId}-${field.name}`);
                if (elem) {
                    if (field.type === "checkbox") {
                        bodyData[field.name] = elem.checked;
                    } else if (field.type === "number") {
                        let val = parseInt(elem.value);
                        if (isNaN(val) && elem.value !== "") {
                            hasError = true;
                        }
                        val = val || 0;

                        // In user-friendly mode, convert minutes to seconds if needed
                        if (!AppState.developerMode && field.convertToSeconds) {
                            val = val * 60;
                        }

                        bodyData[field.name] = val;
                    } else if (field.type === "select") {
                        // Convert to number if the value is numeric
                        const val = elem.value;
                        if (val && !isNaN(val)) {
                            bodyData[field.name] = parseInt(val);
                        } else {
                            bodyData[field.name] = val;
                        }
                    } else {
                        bodyData[field.name] = elem.value;
                    }
                }
            });
        }

        if (hasError) {
            ResponseComponent.showError("Invalid number format");
            return;
        }

        this.executeCommand(cmd, bodyData);
    }

    // Execute a command
    static async executeCommand(cmd, bodyData = null) {
        if (!AppState.connected) {
            ResponseComponent.showError("Not connected to server");
            return;
        }

        ResponseComponent.showLoading("Executing...");

        try {
            const result = await ApiService.executeCommand(cmd, bodyData);
            ResponseComponent.showCommandResult(result, cmd.name);
        } catch (error) {
            ResponseComponent.showError(`Command execution failed: ${error.message}`);
        }
    }

    // Populate pending map select dropdowns
    // Extracted from original populatePendingMapSelects function (lines 2188-2208)
    static populatePendingMapSelects() {
        const pendingSelects = document.querySelectorAll(".map-select-pending");

        pendingSelects.forEach(select => {
            // Clear existing options except placeholder
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add all map options
            AppState.mapList.forEach(map => {
                const option = document.createElement("option");
                option.value = map;
                option.textContent = FormattingUtils.formatMapName(map);
                select.appendChild(option);
            });

            // Remove pending class
            select.classList.remove("map-select-pending");
        });
    }

    // Reinitialize commands (clear and rebuild)
    static reinitializeCommands() {
        console.log('Reinitializing commands...');
        const container = document.getElementById("commandsList");
        if (container) {
            container.innerHTML = '';
            this.initializeCommands();
            // Update button state after re-rendering
            this.updateDeveloperModeButton();
        }
    }

    // Initialize commands component
    static init() {
        // Initial render
        this.initializeCommands();

        // Listen for developer mode changes
        document.addEventListener('developerModeChanged', () => {
            this.reinitializeCommands();
        });

        // Listen for map list changes
        AppState.addStateListener('mapList', () => {
            this.populatePendingMapSelects();
        });

        // Update developer mode button state after render
        this.updateDeveloperModeButton();

        console.log('Commands component initialized');
    }

    // Update developer mode button state
    static updateDeveloperModeButton() {
        const button = document.getElementById('devModeToggle');
        if (button) {
            if (AppState.developerMode) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
        const notice = document.getElementById('devModeNotice');
        if (notice) {
            notice.style.display = AppState.developerMode ? 'block' : 'none';
        }
    }

    // Load and set map list
    static async loadMapList() {
        try {
            const result = await ApiService.loadMapList();

            if (result.success) {
                AppState.setMapList(result.mapList);
                return result.mapList;
            } else {
                console.error('Failed to load map list:', result.error);
                return [];
            }
        } catch (error) {
            console.error('Error loading map list:', error);
            return [];
        }
    }

    // Refresh commands UI (useful when state changes)
    static refresh() {
        this.reinitializeCommands();
    }

    // Get command by name from active command set
    static getCommandByName(commandName) {
        const activeCommands = this.getActiveCommands();

        for (const [section, commands] of Object.entries(activeCommands)) {
            const command = commands.find(cmd => cmd.name === commandName);
            if (command) {
                return { command, section };
            }
        }

        return null;
    }

    // Enable/disable all command buttons
    static enableCommands(enabled) {
        const commandButtons = document.querySelectorAll('.command-button');
        commandButtons.forEach(button => {
            button.disabled = !enabled;
        });
    }

    // Show default commands/response view
    static showDefaultView() {
        const interfaceCard = document.getElementById('interfaceCard');
        if (!interfaceCard) return;

        // Update menu button states
        this.setActiveMenuButton('commandsMenuBtn');

        // Restore original grid layout
        interfaceCard.innerHTML = `
            <div class="grid">
                <!-- Left: Commands -->
                <div class="card">
                    <div class="commands-header">
                        <h2>Commands</h2>
                        <div class="header-actions">
                            <button
                                id="devModeToggle"
                                class="dev-mode-button"
                                onclick="toggleDeveloperMode()"
                                title="Toggle developer mode"
                            >
                                🥷 Developer Mode
                            </button>
                        </div>
                    </div>
                    <div class="dev-mode-notice" id="devModeNotice" style="display: none">
                        Developer mode is a 1:1 mapping of the RCON commands
                    </div>
                    <div class="commands-list" id="commandsList"></div>
                </div>

                <!-- Right: Response -->
                <div class="card">
                    <div class="response-header">
                        <h2>Response</h2>
                        <div class="header-actions">
                            <span
                                class="privacy-badge"
                                title="No logs, credentials, or commands are stored by this tool for your privacy"
                            >
                                🔒 Privacy First
                            </span>
                            <button
                                class="copy-button small"
                                onclick="copyResponse()"
                                id="copyBtn"
                            >
                                📋 Copy Response
                            </button>
                        </div>
                    </div>
                    <div id="response" class="response">Connect to your server to start executing commands</div>
                    <div class="version-footer">
                        <div class="footer-left">
                            Made with ❤️ by
                            <a
                                href="https://discord.com/users/392644735355060225"
                                target="_blank"
                                rel="noopener noreferrer"
                            >SLAPPY</a>
                        </div>
                        <div class="footer-right">
                            <a
                                href="https://hllrcon.com"
                                target="_blank"
                                class="footer-link"
                            >hllrcon.com</a>
                            <span class="footer-separator">•</span>
                            <a
                                id="appVersion"
                                href="https://github.com/Sledro/hllrcon"
                                target="_blank"
                                class="footer-link"
                            >v0.0.0</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Reinitialize commands
        this.initializeCommands();
        this.updateDeveloperModeButton();

        // Update version footer
        this.updateVersionFooter();
    }

    // Set active menu button
    static setActiveMenuButton(activeButtonId) {
        const allButtons = document.querySelectorAll('.menu-button');
        allButtons.forEach(btn => btn.classList.remove('active'));

        const activeButton = document.getElementById(activeButtonId);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    // Update version in footer
    static updateVersionFooter() {
        if (window.appVersionData) {
            const versionEl = document.getElementById('appVersion');
            const githubLinkEl = document.getElementById('githubLink');

            if (versionEl && window.appVersionData.version) {
                versionEl.textContent = window.appVersionData.version;
                versionEl.href = window.appVersionData.githubUrl;
                versionEl.title = window.appVersionData.title;
            }

            if (githubLinkEl && window.appVersionData.githubUrl) {
                githubLinkEl.href = window.appVersionData.githubUrl;
            }
        }
    }
}

// Export global functions for HTML onclick handlers
window.showDefaultView = () => CommandsComponent.showDefaultView();
