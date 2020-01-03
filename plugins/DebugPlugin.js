const path = require('path');
const store = require('../store');

class DebugPlugin {
    constructor(pluginconfig = {}) {
        this.internal = true;
        this.config = pluginconfig;
    }
    async apply(compiler) {
        if (this.config.apply)
            this.config.apply(modulerizr);

        if (this.config.createDebugFile === false)
            return;

        compiler.hooks.modulerizrFinished.tapPromise('DebugPlugin-CreateDebugFile', async(modulerizr, compilation) => {
            const content = JSON.stringify({ config: modulerizr.config, store: store.root() }, null, 1);
            compilation.assets['modulerizr-debug.config.json'] = {
                source() {
                    return content;
                },
                size: content.length
            }
        });
    }
}

exports.DebugPlugin = DebugPlugin;