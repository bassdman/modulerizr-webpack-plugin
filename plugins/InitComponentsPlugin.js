const cheerio = require('cheerio');
const fs = require('fs-extra');
const crypto = require('crypto');
const path = require('path');

const { ensureArray, foreachPromise, globFiles } = require('../utils');

class InitComponentsPlugin {
    constructor(pluginconfig = {}) {
        this.internal = true;
        this.serversideAttributeName = pluginconfig.prerenderscriptAttributeName || 'm-prerenderscript';
    }
    apply(compiler) {
        compiler.hooks.modulerizrInit.tapPromise('InitComponentsPlugin', async(modulerizr) => {
            if (modulerizr.config.components == undefined)
                throw new Error('Error in your modulerizr.config: "src" is undefined but required.');

            const componentFiles = await globFiles(ensureArray(modulerizr.config.components), modulerizr.config._rootPath);
            logFoundFiles(componentFiles, modulerizr);

            return foreachPromise(componentFiles, async fileName => {
                const fileContent = await fs.readFile(fileName, "UTF-8");
                const $ = cheerio.load(`${fileContent}`);
                const $template = $('template');
                const $templateContent = cheerio.load($template.html());

                const componentName = $template.attr('name');

                const prerenderdata = await getPrerenderData($templateContent(`[${this.serversideAttributeName}]`), componentName, this.serversideAttributeName, modulerizr.config._rootPath);

                const retVal = Object.assign({
                    id: crypto.createHash('md5').update(fileContent).digest("hex").substring(0, 8),
                    params: {},
                    key: fileName,
                    content: $template.html(),
                    original: $.html($template),
                    name: componentName,
                    prerenderdata
                }, $template.attributes);

                const attributes = $template.get(0).attribs;

                Object.keys(attributes).forEach(attributeName => {
                    if (attributeName.startsWith(':')) {
                        retVal.params[attributeName.replace(':', '')] = attributes[attributeName];
                        delete retVal[attributeName];
                    }
                })

                modulerizr.store.value(`$.component.id_${retVal.id}`, retVal)

                return retVal;
            })
        });

        compiler.hooks.modulerizrFinished.tapPromise('InitComponentsPlugin-cleanup', async(modulerizr) => {
            return modulerizr.src.$eachPromise(async $ => {
                $(`[${this.serversideAttributeName}]`).remove();
                await fs.remove('./_temp');
            });
        })
    }
}

function logFoundFiles(fileNames, modulerizr) {
    if (fileNames.length == 0) {
        modulerizr.log(`Sorry, no component-files found. Modify the attribute "components" in your modulerizr config to match some files.`, 'red');
    } else {
        modulerizr.log(`Found the following component-files:`);
        fileNames.forEach(file => modulerizr.log(`   - ${file}`));
    }
}

async function getPrerenderData($prerenderdataTags, componentName, serversideAttributeName, rootPath) {
    if ($prerenderdataTags.length == 0)
        return undefined;

    if ($prerenderdataTags.length > 1)
        throw new Error(`Error in component ${componentName}: Just one script with attribute ${serversideAttributeName} can exist in a component. You have ${$prerenderdataTags.length}.`)

    const script = $prerenderdataTags.html().trim();

    const tempFileHash = crypto.createHash('md5').update(script).digest("hex").substring(0, 8);
    const tempFilename = "./_temp/temp_" + tempFileHash + '.js';

    await fs.ensureDir(path.dirname(tempFilename));
    await fs.writeFile(tempFilename, script);

    const returnValue = require(path.join(rootPath, tempFilename));
    const returnData = typeof returnValue.data == 'function' ? returnValue.data() : returnValue.data;
    return returnData;
}

exports.InitComponentsPlugin = InitComponentsPlugin;