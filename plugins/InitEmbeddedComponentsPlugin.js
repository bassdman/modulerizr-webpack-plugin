const crypto = require('crypto');

class InitEmbeddedComponentsPlugin {
    constructor(pluginconfig = {}) {}
    apply(compiler) {
        compiler.hooks.modulerizrPreRenderFile.tap('InitEmbeddedComponentsPlugin', ($, srcfile, context) => {
            addEmbeddedComponents($, context, srcfile);
        })
        compiler.hooks.modulerizrComponentInitialized.tap('InitEmbeddedComponentsPlugin', ($, component, context) => {
            addEmbeddedComponents($, context, component);
        });
    }
}

function addEmbeddedComponents($, context) {
    for (component of context.components) {
        let $allComponents = $(component.name);
        const componentExists = $allComponents.length > 0;

        if (!componentExists)
            continue;

        $allComponents.each((i, e) => {
            const $currentComp = $(e);
            const componentId = crypto.createHash('md5').update($.html($currentComp)).digest("hex").substring(0, 8);
            const original = $.html($currentComp);
            const attributes = Object.assign({}, $currentComp.get(0).attribs);

            $currentComp.attr('data-component-id', componentId);
            $currentComp.attr('data-render-comp', true);

            const embeddedComponentsConfig = {
                id: componentId,
                tag: $currentComp.prop('tagName').toLowerCase(),
                content: $.html($currentComp),
                wrapperTag: getWrapperTag(attributes.wrapper || context.config.defaultComponentWrapper),
                innerHtml: $currentComp.html(),
                componentId: component.id,
                original,
                attributes,
                component,
                slots: getSlots($currentComp, $)
            };

            context.embeddedComponents[embeddedComponentsConfig.id] = embeddedComponentsConfig;
        });
    }
}

function getSlots($comp, $) {
    const $slots = $comp.find('[slot]');

    const slots = {
        _default: $comp.html()
    }

    $slots.each((i, e) => {
        const $currentSlot = $(e);
        const name = $currentSlot.attr('slot') || '_default';
        slots[name] = $currentSlot.html();
    });

    return slots;
}

function getWrapperTag(componentWrapperTag, configWrapperTag) {
    const initialWrapperTag = componentWrapperTag || configWrapperTag || 'div';
    const modifiedWrapperTag = `<${initialWrapperTag}>`.replace('<<', '<').replace('>>', '>');
    return modifiedWrapperTag;
}

exports.InitEmbeddedComponentsPlugin = InitEmbeddedComponentsPlugin;