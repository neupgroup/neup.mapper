export class ConfigLoader {
    static getInstance() {
        if (!ConfigLoader.instance) {
            ConfigLoader.instance = new ConfigLoader();
        }
        return ConfigLoader.instance;
    }
    load(config) {
        this.config = config;
    }
    loadFromFile(path) {
        try {
            // In Node.js environment
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                const configData = fs.readFileSync(path, 'utf8');
                this.config = JSON.parse(configData);
            }
            else {
                // In browser environment, fetch the config file
                fetch(path)
                    .then(response => response.json())
                    .then(config => {
                    this.config = config;
                })
                    .catch((error) => {
                    throw new Error(`Failed to load config from ${path}: ${error.message}`);
                });
            }
        }
        catch (error) {
            throw new Error(`Failed to load config from ${path}: ${error.message}`);
        }
    }
    getConfig() {
        return this.config;
    }
}
