const cheerio = require('cheerio');
const fs = require('fs-extra');
const crypto = require('crypto');
const path = require('path');

const store = require('../store');
const { ensureArray, foreachPromise, globFiles } = require('../utils');

class InitComponentsPlugin {
    constructor(pluginconfig = {}) {
        this.internal = true;
        this.serversideAttributeName = pluginconfig.prerenderscriptAttributeName || 'm-prerenderscript';
    }
    apply(compiler) {
        compiler.hooks.modulerizrInit.tapPromise('InitComponentsPlugin', async(modulerizr) => {
            if (modulerizr.config.components == undefined)
                return;

            const componentFiles = await globFiles(ensureArray(modulerizr.config.components), compiler.context);
            logFoundFiles(componentFiles, modulerizr);

            return foreachPromise(componentFiles, async fileName => {
                const fileContent = await fs.readFile(fileName, "UTF-8");
                const $ = cheerio.load(`${fileContent.replace(/<\s*template/,'<m-template').replace(/template\s*>/,'m-template>')}`);
                const $template = $('m-template');

                const componentName = $template.attr('name');
                const prerenderdata = await getPrerenderData($(`[${this.serversideAttributeName}]`), componentName, this.serversideAttributeName, compiler.context);

                const retVal = Object.assign({
                    id: crypto.createHash('md5').update(fileContent).digest("hex").substring(0, 8),
                    params: {},
                    key: fileName,
                    original: $.html($template),
                    name: componentName,
                    prerenderdata
                }, $template.attributes);

                await compiler.hooks.modulerizrComponentInitialized.promise($, retVal, modulerizr);

                retVal.content = $('m-template').html();

                store.value(`$.component.id_${retVal.id}`, retVal)

                return retVal;
            })
        });

        compiler.hooks.modulerizrFileFinished.tap('InitComponentsPlugin-cleanup', ($, srcFile, modulerizr) => {
            $(`[${this.serversideAttributeName}]`).remove();
        })

        compiler.hooks.modulerizrFinished.tapPromise('InitComponentsPlugin-cleanup', async() => {
            await fs.remove('./_temp');
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