const cheerio = require('cheerio');
const fs = require('fs-extra');
const crypto = require('crypto');
const path = require('path');
const { NodeVM } = require('vm2');
const vm = new NodeVM({
    require: {
        external: true,
        builtin: ['fs', 'path'],
    }
});

const { ensureArray, foreachPromise, globFiles } = require('../utils');

class InitComponentsPlugin {
    constructor(pluginconfig = {}) {
        this.componentconfigAttributeName = pluginconfig.prerenderscriptAttributeName || 'm-componentconfig';
    }
    apply(compiler) {

        compiler.hooks.modulerizrInit.tapPromise('InitComponentsPlugin', async(context) => {
            if (context.config.components == undefined)
                return;

            const componentFiles = await globFiles(ensureArray(context.config.components), compiler.context);
            logFoundFiles(componentFiles, context.logger);

            context.components = [];

            await foreachPromise(componentFiles, async fileName => {
                const content = await fs.readFile(fileName, "UTF-8");
                const $ = cheerio.load(`${content.replace(/<\s*template/,'<m-template').replace(/template\s*>/,'m-template>')}`);
                const $template = $('m-template');

                const componentName = $template.attr('name');
                const prerenderdata = getPrerenderData($(`[${this.componentconfigAttributeName}]`), this.componentconfigAttributeName, path.join(compiler.context, fileName));

                const component = Object.assign({
                    id: crypto.createHash('md5').update(content).digest("hex").substring(0, 8),
                    params: {},
                    key: fileName,
                    content: $.html($template),
                    original: $.html($template),
                    name: componentName,
                    prerenderdata,
                    type: 'component',
                    embeddedComponents: []
                }, $template.attributes);

                context.components.push(component);
            })
            return await foreachPromise(context.components, async component => {
                const $ = cheerio.load(component.content)

                await compiler.hooks.modulerizrComponentInitialized.promise($, component, context);
                component.content = $('m-template').html();
            })
        });

        compiler.hooks.modulerizrFileFinished.tap('InitComponentsPlugin-cleanup', ($, srcFile, context) => {
            $(`[${this.componentconfigAttributeName}]`).remove();
        })
    }
}

function logFoundFiles(fileNames, logger) {
    if (fileNames.length == 0) {
        logger.warn(`No component-files found. Modify the attribute "components" in your modulerizr config to match some files. Process will be continued without components.`);
    } else {
        logger.debug(`Found the following component-files:`);
        fileNames.forEach(file => logger.debug(`   - ${file}`));
    }
}

async function getPrerenderData($prerenderdataTags, componentconfigAttributeName, filename) {
    if ($prerenderdataTags.length == 0)
        return undefined;

    if ($prerenderdataTags.length > 1)
        throw new Error(`Error in file ${filename}: Just one script with attribute ${componentconfigAttributeName} can exist in a component. You have ${$prerenderdataTags.length}.`)

    const script = $prerenderdataTags.html().trim();

    try {
        const componentConfig = vm.run(script);
        const returnData = typeof componentConfig.data == 'function' ? componentConfig.data() : componentConfig.data;
        return returnData;
    } catch (e) {
        console.error(`\nError in file '${filename}':\nThe Componentconfig has an error.\n`);
        console.error(e);
        process.exit(1);
    }
}

exports.InitComponentsPlugin = InitComponentsPlugin;