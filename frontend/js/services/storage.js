// LocalStorage management service
// Handles all localStorage operations with proper error handling

import { APP_CONFIG } from '../core/config.js';

export class StorageService {
    static #vaultKey = null;
    static #textEncoder = new TextEncoder();
    static #textDecoder = new TextDecoder();

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

    // Encrypted credential vault management
    static isCredentialVaultUnlocked() {
        return this.#vaultKey !== null;
    }

    static lockCredentialVault() {
        this.#vaultKey = null;
    }

    static async unlockCredentialVault(passphrase) {
        if (!window.crypto?.subtle) {
            return { success: false, error: 'Web Crypto API is not available in this browser.' };
        }

        if (!passphrase || passphrase.length < 8) {
            return { success: false, error: 'Passphrase must be at least 8 characters.' };
        }

        try {
            const saltBase64 = this.#getOrCreateVaultSalt();
            this.#vaultKey = await this.#deriveVaultKey(passphrase, saltBase64);

            // Validate passphrase against existing encrypted data.
            await this.getRecentServers();

            const migrated = await this.#migrateLegacyRecentServers();
            return { success: true, migrated };
        } catch (error) {
            this.lockCredentialVault();
            return { success: false, error: 'Unable to unlock vault. Check passphrase or clear corrupted data.' };
        }
    }

    static async getRecentServers() {
        if (!this.isCredentialVaultUnlocked()) {
            return [];
        }

        const encrypted = this.get(APP_CONFIG.STORAGE_KEYS.RECENT_SERVERS_ENCRYPTED, null);
        if (!encrypted) {
            return [];
        }

        try {
            const payload = JSON.parse(encrypted);
            const decryptedText = await this.#decryptString(payload);
            const parsed = JSON.parse(decryptedText);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            throw new Error('Failed to decrypt recent servers vault');
        }
    }

    static async addRecentServer({ host, port, password }) {
        if (!this.isCredentialVaultUnlocked()) {
            return { success: false, error: 'Credential vault is locked.' };
        }

        const servers = await this.getRecentServers();
        const key = `${host}:${port}`;
        const filtered = servers.filter(s => `${s.host}:${s.port}` !== key);
        filtered.unshift({ host, port, password });
        if (filtered.length > 10) filtered.length = 10;

        const success = await this.#saveEncryptedRecentServers(filtered);
        return success
            ? { success: true }
            : { success: false, error: 'Failed to save encrypted credentials.' };
    }

    static async removeRecentServer(host, port) {
        if (!this.isCredentialVaultUnlocked()) {
            return { success: false, error: 'Credential vault is locked.' };
        }

        const servers = await this.getRecentServers();
        const key = `${host}:${port}`;
        const filtered = servers.filter(s => `${s.host}:${s.port}` !== key);

        const success = await this.#saveEncryptedRecentServers(filtered);
        return success
            ? { success: true }
            : { success: false, error: 'Failed to update encrypted credentials.' };
    }

    static clearCredentialVaultData() {
        this.lockCredentialVault();
        const removedEncrypted = this.remove(APP_CONFIG.STORAGE_KEYS.RECENT_SERVERS_ENCRYPTED);
        const removedSalt = this.remove(APP_CONFIG.STORAGE_KEYS.CREDENTIAL_VAULT_SALT);
        const removedLegacy = this.remove(APP_CONFIG.STORAGE_KEYS.RECENT_SERVERS);
        return removedEncrypted && removedSalt && removedLegacy;
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

    static #getOrCreateVaultSalt() {
        const existing = this.get(APP_CONFIG.STORAGE_KEYS.CREDENTIAL_VAULT_SALT, null);
        if (existing) {
            return existing;
        }

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const saltBase64 = this.#bytesToBase64(salt);
        this.set(APP_CONFIG.STORAGE_KEYS.CREDENTIAL_VAULT_SALT, saltBase64);
        return saltBase64;
    }

    static async #deriveVaultKey(passphrase, saltBase64) {
        const baseKey = await crypto.subtle.importKey(
            'raw',
            this.#textEncoder.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: this.#base64ToBytes(saltBase64),
                iterations: 250000,
                hash: 'SHA-256'
            },
            baseKey,
            {
                name: 'AES-GCM',
                length: 256
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    static async #encryptString(plaintext) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.#vaultKey,
            this.#textEncoder.encode(plaintext)
        );

        return {
            v: 1,
            iv: this.#bytesToBase64(iv),
            data: this.#bytesToBase64(new Uint8Array(ciphertext))
        };
    }

    static async #decryptString(payload) {
        if (!payload || payload.v !== 1 || !payload.iv || !payload.data) {
            throw new Error('Invalid vault payload');
        }

        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: this.#base64ToBytes(payload.iv) },
            this.#vaultKey,
            this.#base64ToBytes(payload.data)
        );

        return this.#textDecoder.decode(plaintext);
    }

    static async #saveEncryptedRecentServers(servers) {
        try {
            const payload = await this.#encryptString(JSON.stringify(servers));
            return this.set(APP_CONFIG.STORAGE_KEYS.RECENT_SERVERS_ENCRYPTED, JSON.stringify(payload));
        } catch (error) {
            console.error('Error encrypting recent servers:', error);
            return false;
        }
    }

    static async #migrateLegacyRecentServers() {
        const legacyServers = this.getJSON(APP_CONFIG.STORAGE_KEYS.RECENT_SERVERS, []);
        if (!Array.isArray(legacyServers) || legacyServers.length === 0) {
            return false;
        }

        const existingServers = await this.getRecentServers();
        const mergedByKey = new Map();

        [...legacyServers, ...existingServers].forEach(server => {
            if (!server || !server.host || !server.port) return;
            const key = `${server.host}:${server.port}`;
            if (!mergedByKey.has(key)) {
                mergedByKey.set(key, server);
            }
        });

        const merged = Array.from(mergedByKey.values()).slice(0, 10);
        const saved = await this.#saveEncryptedRecentServers(merged);
        if (saved) {
            this.remove(APP_CONFIG.STORAGE_KEYS.RECENT_SERVERS);
        }

        return saved;
    }

    static #bytesToBase64(bytes) {
        let binary = '';
        bytes.forEach(byte => {
            binary += String.fromCharCode(byte);
        });
        return btoa(binary);
    }

    static #base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
}
