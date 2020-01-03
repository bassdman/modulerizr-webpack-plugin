const crypto = require('crypto');
const store = require('../store');

class InitEmbeddedComponentsPlugin {
    constructor(pluginconfig = {}) {
        this.internal = true;
    }
    apply(compiler) {
        compiler.hooks.modulerizrInit.tap('InitEmbeddedComponentsPlugin', modulerizr => {
            modulerizr.src.$each($ => {
                return addEmbeddedComponents(modulerizr, $);
            })
        })
        compiler.hooks.modulerizrComponentInitialized.tap('InitComponentPlugin-TestComponentInitialized', ($, component, modulerizr) => {
            addEmbeddedComponents(modulerizr, $);
        });
    }
}

function addEmbeddedComponents(modulerizr, $, currentPathAll, i) {
    const globalWrapperTag = modulerizr.config.defaultComponentWrapper;

    return store.each("$.component.*", (component, currentPath, i) => {
        let $allComponents = $(component.name);
        const componentExists = $allComponents.length > 0;

        if (!componentExists)
            return;

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
                wrapperTag: getWrapperTag(attributes.wrapper || globalWrapperTag),
                innerHtml: $currentComp.html(),
                componentId: component.id,
                original,
                attributes,
                slots: getSlots($currentComp, $)
            }
            store.value(`$.embeddedComponents.id_${componentId}`, embeddedComponentsConfig);

            if (currentPathAll)
                store.value(`${currentPathAll}.content`, $.html(':root'));
        });
    })
    return;
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