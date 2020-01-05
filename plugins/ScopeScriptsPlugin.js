class ScopeScriptsPlugin {
    constructor(pluginconfig = {}) {
        this.scopedAttributeName = pluginconfig.scopedAttributeName || 'm-scoped';
        this.internal = true;
    }
    apply(compiler) {
        compiler.hooks.modulerizrComponentInitialized.tap('InitComponentPlugin-TestComponentInitialized', ($, component, context) => {
            const $scriptTags = $(`script[${this.scopedAttributeName}]`);
            $scriptTags.each((i, e) => {
                const $currentScripts = $(e);

                const scopedScript = `(function(window){
                        var _component = {
                            id: "${component.id}",
                            name: "${component.name}",
                            $el: document.getElementById("${component.id}"),
                            data: ##component.data##,
                            attributes: ##component.attributes##,
                            slots: ##component.slots##,
                        };
                        ${$currentScripts.html()}
                    })(window);`;
                $currentScripts.html(scopedScript);
            });
        });

        compiler.hooks.modulerizrFileRendered.tap('ScopeScriptsPlugin-cleanup', ($, srcFile) => {
            const $scopedScripts = $(`script[${this.scopedAttributeName}]`);
            $scopedScripts.each((i, e) => {
                const embeddedComponentId = $(e).parent('[data-component-instance]').attr('data-component-instance');

                const component = srcFile.embeddedComponents.find(comp => comp.id == embeddedComponentId);
                const replacedScript = $(e).html()
                    .replace('##component.attributes##', JSON.stringify(component.attributes))
                    .replace('##component.data##', JSON.stringify(Object.assign({}, component.attributes, component.component.prerenderdata || {})))
                    .replace('##component.slots##', JSON.stringify(component.slots));

                $(e).html(replacedScript);
            })
        });

        compiler.hooks.modulerizrFileFinished.tap('ScopeScriptsPlugin-cleanup', ($) => {
            $(`[${this.scopedAttributeName}]`).removeAttr(this.scopedAttributeName);
        })
    }
}

exports.ScopeScriptsPlugin = ScopeScriptsPlugin;