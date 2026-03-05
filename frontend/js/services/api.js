// API service - handles all server communication
// Extracted from app.js lines 1782-1865, 1918-1926, 1928-1981, 2106-2186

import { AppState } from '../core/state.js';
import { APP_CONFIG } from '../core/config.js';

export class ApiService {
    // Execute a command with optional body data
    // Extracted from original executeCommand function (lines 1782-1865)
    static async executeCommand(cmd, bodyData = null) {
        if (!AppState.connected) {
            throw new Error('Not connected to server');
        }

        // Track the command for success messages
        AppState.setLastExecutedCommand(cmd.name);

        try {
            let path = cmd.path;
            const options = {
                method: cmd.method,
                credentials: "include",
                headers: {},
            };

            // Replace path parameters with actual values
            if (bodyData && path.includes(":")) {
                // Find all :param patterns in the path
                const paramMatches = path.match(/:[a-zA-Z_]+/g);
                if (paramMatches) {
                    paramMatches.forEach((param) => {
                        const paramName = param.substring(1); // Remove the ':'

                        // Check if we have a field that matches this path param
                        // Common mappings: :id -> player_id, :index -> index, etc.
                        let fieldValue = null;

                        if (paramName === "id" && bodyData.player_id) {
                            fieldValue = bodyData.player_id;
                            delete bodyData.player_id;
                        } else if (bodyData[paramName]) {
                            fieldValue = bodyData[paramName];
                            delete bodyData[paramName];
                        }

                        if (fieldValue) {
                            path = path.replace(param, fieldValue);
                        }
                    });
                }
            }

            if (bodyData && Object.keys(bodyData).length > 0) {
                if (cmd.method === "GET") {
                    // For GET requests, add as query parameters
                    const queryParams = new URLSearchParams();
                    Object.keys(bodyData).forEach((key) => {
                        if (
                            bodyData[key] !== "" &&
                            bodyData[key] !== null &&
                            bodyData[key] !== undefined
                        ) {
                            queryParams.append(key, bodyData[key]);
                        }
                    });
                    const queryString = queryParams.toString();
                    if (queryString) {
                        path += (path.includes("?") ? "&" : "?") + queryString;
                    }
                } else {
                    options.headers["Content-Type"] = "application/json";
                    options.body = JSON.stringify(bodyData);
                }
            }

            const res = await fetch(path, options);
            const data = await res.json();

            if (res.ok) {
                return { success: true, data, commandName: cmd.name };
            } else {
                return {
                    success: false,
                    error: `Error ${res.status}: ${JSON.stringify(data)}`,
                    status: res.status,
                    data
                };
            }
        } catch (e) {
            return {
                success: false,
                error: `Request failed: ${e.message}`,
                exception: e
            };
        }
    }

    // Check connection status
    // Extracted from original checkStatus function (lines 1918-1926)
    static async checkStatus() {
        try {
            const res = await fetch("/api/v2/connection/status");
            const data = await res.json();
            return { success: true, connected: data.connected, data };
        } catch (e) {
            return { success: false, connected: false, error: e.message };
        }
    }

    // Connect to server
    // Extracted from original connect function (lines 1928-1965)
    static async connect(host, port, password) {
        if (!host || !port || !password) {
            return { success: false, error: 'Missing required connection parameters' };
        }

        try {
            const res = await fetch("/api/v2/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ host, port, password }),
            });

            const data = await res.json();

            if (res.ok) {
                return {
                    success: true,
                    message: "Connected successfully!",
                    data
                };
            } else {
                return {
                    success: false,
                    error: `Connection failed: ${JSON.stringify(data)}`,
                    data
                };
            }
        } catch (e) {
            return {
                success: false,
                error: `Connection failed: ${e.message}`,
                exception: e
            };
        }
    }

    // Disconnect from server
    // Extracted from original disconnect function (lines 1967-1981)
    static async disconnect() {
        try {
            const res = await fetch("/api/v2/disconnect", {
                method: "POST",
                credentials: "include",
            });

            if (res.ok) {
                return { success: true, message: "Disconnected successfully" };
            } else {
                return { success: false, error: "Disconnect request failed" };
            }
        } catch (e) {
            return {
                success: false,
                error: `Disconnect failed: ${e.message}`,
                exception: e
            };
        }
    }

    // Load version information
    // Extracted from original loadVersion function (lines 2106-2143)
    static async loadVersion() {
        try {
            const res = await fetch("/version");
            const data = await res.json();

            let versionText = data.version || "dev";
            let githubUrl = "https://github.com/Sledro/hllrcon";

            // Determine the GitHub link based on version type
            if (data.version && data.version.startsWith("v") && data.version !== "dev") {
                // For tagged versions (v1.0.0), link to releases
                githubUrl = `https://github.com/Sledro/hllrcon/releases/tag/${data.version}`;
            } else if (data.git_commit && data.git_commit !== "unknown") {
                // For commits, link to the specific commit
                githubUrl = `https://github.com/Sledro/hllrcon/commit/${data.git_commit}`;
                versionText += ` (${data.git_commit.substring(0, 7)})`;
            }

            return {
                success: true,
                version: versionText,
                githubUrl,
                title: `${data.version}\nCommit: ${data.git_commit}\nBuild Date: ${data.build_date}\nClick to view on GitHub`,
                data
            };
        } catch (e) {
            return {
                success: false,
                version: "dev",
                githubUrl: "https://github.com/Sledro/hllrcon",
                error: e.message
            };
        }
    }

    // Load map list
    // Extracted from original loadMapList function (lines 2172-2186)
    static async loadMapList() {
        try {
            const res = await fetch("/api/v2/maps");
            const text = await res.text();
            const mapList = text.trim().split("\n").filter((line) => line.trim() !== "");

            return { success: true, mapList };
        } catch (e) {
            console.error("Failed to load map list:", e);
            return { success: false, mapList: [], error: e.message };
        }
    }

    // Helper method to build request options
    static #buildRequestOptions(method, data = null) {
        const options = {
            method,
            credentials: "include",
            headers: {},
        };

        if (data && Object.keys(data).length > 0) {
            if (method === "GET") {
                // GET requests don't have body, should use query params
                return options;
            } else {
                options.headers["Content-Type"] = "application/json";
                options.body = JSON.stringify(data);
            }
        }

        return options;
    }

    // Generic fetch wrapper with error handling
    static async #fetchWithErrorHandling(url, options = {}) {
        try {
            const response = await fetch(url, {
                credentials: "include",
                ...options
            });

            const data = await response.json();

            return {
                success: response.ok,
                status: response.status,
                data,
                error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                data: null,
                error: `Network error: ${error.message}`,
                exception: error
            };
        }
    }
}
