class ScopeScriptsPlugin {
    constructor(pluginconfig = {}) {
        this.scopedAttributeName = pluginconfig.scopedAttributeName || 'm-scoped';
        this.internal = true;
    }
    apply(compiler) {
        compiler.hooks.modulerizrComponentInitialized.tap('InitComponentPlugin-TestComponentInitialized', ($, component, modulerizr) => {
            const $scriptTags = $(`script[${this.scopedAttributeName}]`);
            $scriptTags.each((i, e) => {
                const $currentScripts = $(e);

                const scopedScript = `(function(window){
                        var _m = {
                            id: "${component.id}",
                            name: "${component.name}",
                            $el: document.getElementById("${component.id}"),
                            attributes: ##component.attributes##,
                            slots: ##component.slots##
                        };
                        ${$currentScripts.html()}
                    })(window);`;
                $currentScripts.html(scopedScript);
            });
            //   console.log($(':root').html())
        });

        compiler.hooks.modulerizrAfterRender.tap('ScopeScriptsPlugin-afterRender', modulerizr => {
            modulerizr.src.$each(`script[${this.scopedAttributeName}]`, $ => {
                const embeddedComponentId = $.parent('[data-component-instance]').attr('data-component-instance');
                const embeddedComponent = modulerizr.store.queryOne(`$.embeddedComponents.id_${embeddedComponentId}`);

                const replacedScript = $.html()
                    .replace('##component.attributes##', JSON.stringify(embeddedComponent.attributes))
                    .replace('##component.slots##', JSON.stringify(embeddedComponent.slots));

                $.html(replacedScript);
            });
        })

        compiler.hooks.modulerizrFinished.tap('ScopeScriptsPlugin-cleanup', modulerizr => {
            modulerizr.src.$each($ => {
                $(`[${this.scopedAttributeName}]`).removeAttr(this.scopedAttributeName);
            });
        })
    }
}

exports.ScopeScriptsPlugin = ScopeScriptsPlugin;