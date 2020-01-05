const fs = require('fs-extra');
const crypto = require('crypto');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const { ensureArray, globFiles, foreachPromise } = require('../utils');


class InitSrcPlugin {
    constructor(config = {}) {
        config = config;
    }
    apply(compiler) {
        compiler.hooks.modulerizrInit.tapPromise('InitSrcPlugin', async(context) => {
            if (context.config.src == undefined)
                throw new Error('Error in your config: "src" is undefined but required.');

            const srcFiles = await globFiles(ensureArray(context.config.src), compiler.context);
            context.nrOfFiles = srcFiles.length;

            logFoundFiles(srcFiles, context);

            await foreachPromise(srcFiles, async filePath => {
                const content = await fs.readFile(filePath, "UTF-8")
                const retObj = {
                    registeredComponents: context.components,
                    original: content,
                    path: filePath,
                    type: 'src',
                    absolutePath: path.join(compiler.context, filePath),
                    key: filePath,
                    embeddedComponents: [],
                    id: crypto.createHash('md5').update(content).digest("hex").substring(0, 8)
                };

                const filepath = path.join(filePath)
                const srcOptions = Object.assign({}, context.config.srcOptions || {}, {
                    template: filepath,
                    filename: path.basename(filepath),
                    modulerizr: retObj
                });

                new HtmlWebpackPlugin(srcOptions).apply(compiler);
                return retObj;
            });
            return;
        })
    }
}

function logFoundFiles(fileNames, context) {
    if (fileNames.length == 0) {
        context.logger.error(`Sorry, no src-files found. Modify the attribute "src" in your modulerizr config to match some files.`);
    } else {
        context.logger.debug(`Found the following src-files:`);
        fileNames.forEach(file => context.logger.debug(`   - ${file}`));
    }
}

exports.InitSrcPlugin = InitSrcPlugin;