// Formatting utilities
// Extracted from app.js and other formatting helpers

import { AppState } from '../core/state.js';

export class FormattingUtils {
    // Format map name for user-friendly display
    // Extracted from original formatMapName function (lines 2149-2170)
    static formatMapName(mapId) {
        if (AppState.developerMode) {
            return mapId;
        }

        // Convert technical map name to friendly format
        // Example: "carentan_warfare" -> "Carentan - Warfare"
        const parts = mapId.split('_');
        if (parts.length >= 2) {
            const mapName = parts.slice(0, -1).join(' ');
            const gameMode = parts[parts.length - 1];

            // Capitalize each word
            const formattedMapName = mapName.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            const formattedGameMode = gameMode.charAt(0).toUpperCase() + gameMode.slice(1);

            return `${formattedMapName} - ${formattedGameMode}`;
        }
        return mapId;
    }

    // Format field names for display (convert snake_case to Title Case)
    static formatFieldName(fieldName) {
        return fieldName
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Format JSON with syntax highlighting (for display)
    static formatJSON(obj, indent = 2) {
        try {
            return JSON.stringify(obj, null, indent);
        } catch (error) {
            console.error('Error formatting JSON:', error);
            return String(obj);
        }
    }

    // Format response text with proper highlighting
    static formatResponse(text, isError = false) {
        if (typeof text !== 'string') {
            text = this.formatJSON(text);
        }

        // Try to parse and highlight as JSON
        try {
            const parsed = JSON.parse(text);
            return {
                type: 'json',
                content: this.formatJSON(parsed),
                isError
            };
        } catch (e) {
            // Not JSON, return as plain text
            return {
                type: 'text',
                content: text,
                isError
            };
        }
    }

    // Format file size in human readable format
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Format duration in human readable format
    static formatDuration(seconds) {
        if (seconds < 60) return `${seconds} seconds`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
        return `${Math.floor(seconds / 86400)} days`;
    }

    // Format timestamp to local time string
    static formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (error) {
            return String(timestamp);
        }
    }

    // Truncate text with ellipsis
    static truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    // Escape HTML entities
    static escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Format error messages consistently
    static formatError(error, context = '') {
        let message = 'An error occurred';

        if (typeof error === 'string') {
            message = error;
        } else if (error && error.message) {
            message = error.message;
        } else if (error && error.error) {
            message = error.error;
        }

        return context ? `${context}: ${message}` : message;
    }

    // Format success messages consistently
    static formatSuccess(message, data = null) {
        if (data && typeof data === 'object') {
            return `${message}\n\nDetails:\n${this.formatJSON(data)}`;
        }
        return message;
    }

    // Convert bytes to human readable storage size
    static formatStorageSize(bytes) {
        return this.formatFileSize(bytes);
    }

    // Format numbers with thousand separators
    static formatNumber(num) {
        if (typeof num !== 'number') return String(num);
        return num.toLocaleString();
    }

    // Format percentage values
    static formatPercentage(value, decimal = 1) {
        if (typeof value !== 'number') return String(value);
        return `${(value * 100).toFixed(decimal)}%`;
    }
}
