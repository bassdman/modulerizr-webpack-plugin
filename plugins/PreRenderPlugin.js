const cheerio = require('cheerio');

class PreRenderPlugin {
    constructor(pluginconfig = {}) {
        this.internal = true;
    }
    apply(compiler, store) {
        compiler.hooks.modulerizrTriggerRenderFile.tapPromise('ModulerizrPreRenderPlugin', async($, htmlPluginData, modulerizr) => {
            let allComponentsRendered = false;
            let level = 1;

            await compiler.hooks.modulerizrPreRenderFile.promise($, htmlPluginData.plugin.options.modulerizr);

            while (!allComponentsRendered) {
                render($, htmlPluginData.plugin.options.modulerizr, store);

                if ($('[data-render-comp]').length == 0)
                    allComponentsRendered = true;

                if (level >= modulerizr.config.maxRecursionLevel) {
                    throw new Error('There is a Problem with infinite recursion in nested Elements. Sth like Component "A" includes Component "B"  and Component "B" includes Component "A". This leads to an infinite loop. Please fix this.');
                }
                level++;
            }

            await compiler.hooks.modulerizrFileRendered.promise($, htmlPluginData.plugin.options.modulerizr, modulerizr);
            await compiler.hooks.modulerizrFileFinished.promise($, htmlPluginData.plugin.options.modulerizr, modulerizr);

            const replacedHtml = $.html(':root');

            htmlPluginData.html = replacedHtml;
        })

        compiler.hooks.modulerizrFileFinished.tap('ScopeScriptsPlugin-cleanup', ($) => {
            $(`[data-component-instance]`).removeAttr('data-component-instance');
        })
    }
}


function render($, srcfile, store) {
    const $embeddedComponents = $('[data-render-comp]');
    $embeddedComponents.each((i, e) => {
        const $currentComp = $(e);
        const embeddedComp = store.embeddedComponents[$currentComp.attr('data-component-id')];
        srcfile.embeddedComponents.push(embeddedComp);
        if (embeddedComp.wrapperTag != null) {
            $currentComp.wrap(embeddedComp.wrapperTag);
            $currentComp.parent()
                .attr("data-v-" + embeddedComp.component.id, "")
                .attr("id", embeddedComp.component.id)
                .attr("data-component", embeddedComp.tag)
                .attr("data-component-instance", embeddedComp.id)
        }
        const componentConfig = srcfile.registeredComponents.find(file => file.id == embeddedComp.component.id);
        const replacedContent = replaceSlots(componentConfig.content, embeddedComp);


        $currentComp.replaceWith(replacedContent.trim());
    })
}

function replaceSlots(currentContent, embeddedComp) {
    const $ = cheerio.load(currentContent);

    const $slots = $(':root').find('slot');
    $slots.each((i, e) => {
        const $currentSlot = $(e);
        const name = $currentSlot.attr('name') || '_default';
        const newContent = embeddedComp.slots[name] || $currentSlot.html();

        $currentSlot.replaceWith(newContent);
    });
    return $(':root').html();
}


exports.PreRenderPlugin = PreRenderPlugin;