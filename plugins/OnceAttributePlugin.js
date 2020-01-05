const crypto = require('crypto');

class OnceAttributePlugin {
    constructor(pluginconfig = {}) {
        this.onceAttributeName = pluginconfig.onceAttributeName || 'm-once';
        this.internal = true;
    }
    apply(compiler) {
        compiler.hooks.modulerizrFileRendered.tap('OnceAttributePlugin', ($, file, context) => {
            const onceAttributes = {};

            logIfExternalScriptWithoutOnceFound(context.logger, $, this.onceAttributeName);
            //identical style Tags are automatically rendered once
            $('style').attr(this.onceAttributeName, "");

            const $onceAttributes = $(`[${this.onceAttributeName}]`);
            $onceAttributes.each((i, e) => {
                const $currentOnceAttribute = $(e);
                const htmlToValidate = $.html($currentOnceAttribute).replace(/\s/g, "");

                const elementHash = crypto.createHash('md5').update(htmlToValidate).digest("hex").substring(0, 16);
                if (onceAttributes[elementHash] != null) {
                    $currentOnceAttribute.replaceWith('<!-- Here was a component with attribute "m-once", which also exists above. -->');
                    return;
                }
                onceAttributes[elementHash] = true;
            });
            $onceAttributes.removeAttr(this.onceAttributeName);
        })
    }
}

function logIfExternalScriptWithoutOnceFound(logger, $, onceAttributeName) {
    const $externalScriptsWithoutOnceAttr = $('[data-component] script[src]').not(`[${onceAttributeName}]`);
    const $externalStylesWithoutOnceAttr = $('[data-component] link[href]').not(`[${onceAttributeName}]`);
    const alreadyLoggedCache = {};
    $externalScriptsWithoutOnceAttr.each((i, elem) => {
        const srcEntry = $(elem).attr('src');
        if ($(elem).attr('nolog') !== undefined || alreadyLoggedCache[srcEntry] !== undefined)
            return;

        alreadyLoggedCache[srcEntry] = true;
        logger.warn(`   Script "${srcEntry}" in component "${$(elem).parent('[data-component]').data('component')}" has not a once-attribute. This means, it is executed each time your component is rendered. Is this your purpose? If yes, add attribute "nolog" to hide these logs.`)
    });

    $externalStylesWithoutOnceAttr.each((i, elem) => {
        const srcEntry = $(elem).attr('href');

        if ($(elem).attr('nolog') !== undefined || alreadyLoggedCache[srcEntry] !== undefined)
            return;

        alreadyLoggedCache[srcEntry] = true;
        logger.warn(`   Style "${$(elem).attr('href')}" in component "${$(elem).parent('[data-component]').data('component')}" has not a once-attribute. This means, it is executed each time your component is rendered. Is this your purpose? If yes, add attribute "nolog" to hide these logs.\n`)
    });
}

exports.OnceAttributePlugin = OnceAttributePlugin;