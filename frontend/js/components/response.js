// Response handling component
// Extracted from app.js lines 2029-2104

import { successMessages } from '../core/config.js';
import { AppState } from '../core/state.js';
import { FormattingUtils } from '../utils/formatting.js';
import { HelperUtils } from '../utils/helpers.js';

export class ResponseComponent {
    // Show response in the response panel
    // Extracted from original showResponse function (lines 2029-2078)
    static showResponse(text, isError = false, commandName = null) {
        const resp = document.getElementById("response");
        if (!resp) {
            console.error('Response element not found');
            return;
        }

        if (isError) {
            resp.classList.add("error");
            resp.textContent = text;
        } else {
            resp.classList.remove("error");

            // Display raw RCON response with syntax highlighting
            const rawText = typeof text === "string" ? text : JSON.stringify(text, null, 2);

            // In user-friendly mode, check for empty string responses
            if (!AppState.developerMode && commandName && rawText.trim() === '""') {
                // Look up success message for this command
                const successMessage = successMessages[commandName];
                if (successMessage) {
                    resp.textContent = successMessage;
                    return;
                }
            }

            // Try to parse and highlight as JSON
            try {
                const parsed = JSON.parse(rawText);

                // In user-friendly mode, format nicely
                if (!AppState.developerMode && typeof parsed === 'object' && parsed !== null) {
                    // For empty objects/arrays or simple success responses, show user-friendly message
                    if ((Array.isArray(parsed) && parsed.length === 0) ||
                        (Object.keys(parsed).length === 0)) {
                        const successMessage = successMessages[commandName];
                        if (successMessage) {
                            resp.textContent = successMessage;
                            return;
                        }
                    }
                }

                const formatted = JSON.stringify(parsed, null, 2);
                const highlighted = hljs.highlight(formatted, {
                    language: "json",
                }).value;
                resp.innerHTML = `<pre><code class="language-json">${highlighted}</code></pre>`;
            } catch (e) {
                // Not JSON, display as plain text
                resp.textContent = rawText;
            }
        }
    }

    // Copy response content to clipboard
    // Extracted from original copyResponse function (lines 2080-2104)
    static async copyResponse() {
        const resp = document.getElementById("response");
        const copyBtn = document.getElementById("copyBtn");

        if (!resp || !copyBtn) {
            console.error('Response or copy button element not found');
            return;
        }

        try {
            // Get the text content (without HTML formatting)
            const text = resp.textContent;
            const result = await HelperUtils.copyToClipboard(text);

            if (result.success) {
                // Visual feedback
                copyBtn.textContent = "✓ Copied!";
                copyBtn.classList.add("copied");

                setTimeout(() => {
                    copyBtn.textContent = "📋 Copy Response";
                    copyBtn.classList.remove("copied");
                }, 2000);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error("Failed to copy:", err);
            copyBtn.textContent = "✗ Failed";
            setTimeout(() => {
                copyBtn.textContent = "📋 Copy Response";
            }, 2000);
        }
    }

    // Show loading state in response
    static showLoading(message = "Executing...") {
        this.showResponse(message, false);
    }

    // Show success message
    static showSuccess(message, data = null) {
        const formattedMessage = FormattingUtils.formatSuccess(message, data);
        this.showResponse(formattedMessage, false);
    }

    // Show error message
    static showError(error, context = null) {
        const formattedError = FormattingUtils.formatError(error, context);
        this.showResponse(formattedError, true);
    }

    // Show API response based on result
    static showApiResponse(result) {
        if (result.success) {
            this.showResponse(
                JSON.stringify(result.data, null, 2),
                false,
                result.commandName
            );
        } else {
            this.showError(result.error || 'Unknown error occurred');
        }
    }

    // Clear response
    static clear() {
        const resp = document.getElementById("response");
        if (resp) {
            resp.textContent = "";
            resp.classList.remove("error");
        }
    }

    // Set initial message
    static setInitialMessage() {
        this.showResponse("Connect to your server to start executing commands", false);
    }

    // Initialize response component
    static init() {
        // Set up copy button if it exists
        const copyBtn = document.getElementById("copyBtn");
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyResponse());
        }

        // Set initial message
        this.setInitialMessage();
    }

    // Handle response based on connection state
    static handleConnectionResponse(result) {
        if (result.success) {
            this.showSuccess(
                result.message,
                result.data
            );
        } else {
            this.showError(result.error);
        }
    }

    // Format and show command execution result
    static showCommandResult(result, commandName) {
        if (result.success) {
            // Check if we should show a user-friendly success message
            if (!AppState.developerMode && commandName) {
                const successMessage = successMessages[commandName];
                if (successMessage && (!result.data || this.#isEmptyResponse(result.data))) {
                    this.showResponse(successMessage, false);
                    return;
                }
            }

            // Show the actual response data
            this.showResponse(
                JSON.stringify(result.data, null, 2),
                false,
                commandName
            );
        } else {
            this.showError(result.error);
        }
    }

    // Helper method to check if response is empty
    static #isEmptyResponse(data) {
        if (data === null || data === undefined) return true;
        if (typeof data === 'string' && data.trim() === '') return true;
        if (Array.isArray(data) && data.length === 0) return true;
        if (typeof data === 'object' && Object.keys(data).length === 0) return true;
        return false;
    }
}

// Export the global function for HTML onclick handlers
window.copyResponse = () => ResponseComponent.copyResponse();
