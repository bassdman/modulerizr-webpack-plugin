const fs = require('fs-extra');
const crypto = require('crypto');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const { ensureArray, globFiles, foreachPromise } = require('../utils');


class InitSrcPlugin {
    constructor(pluginconfig = {}) {
        this.internal = true;
    }
    apply(compiler) {
        compiler.hooks.modulerizrInit.tapPromise('InitSrcPlugin', async(modulerizr) => {
            if (modulerizr.config.src == undefined)
                throw new Error('Error in your modulerizr.config: "src" is undefined but required.');

            const srcFiles = await globFiles(ensureArray(modulerizr.config.src), compiler.context);
            logFoundFiles(srcFiles, modulerizr);

            await foreachPromise(srcFiles, async filePath => {
                const content = await fs.readFile(filePath, "UTF-8")
                const retObj = {
                    content,
                    original: content,
                    path: filePath,
                    absolutePath: path.join(compiler.context, filePath),
                    key: filePath,
                    id: crypto.createHash('md5').update(content).digest("hex").substring(0, 8)
                };

                const filepath = path.join(filePath)
                const srcOptions = Object.assign({}, modulerizr.config.srcOptions || {}, {
                    template: filepath,
                    filename: path.basename(filepath)
                });

                new HtmlWebpackPlugin(srcOptions).apply(compiler);
                return retObj;
            });
            return;
        })
    }
}

function logFoundFiles(fileNames, modulerizr) {
    if (fileNames.length == 0) {
        modulerizr.log(`Sorry, no src-files found. Modify the attribute "src" in your modulerizr config to match some files.`, 'error');
    } else {
        modulerizr.log(`Found the following src-files:`);
        fileNames.forEach(file => modulerizr.log(`   - ${file}`));
    }
}

exports.InitSrcPlugin = InitSrcPlugin;