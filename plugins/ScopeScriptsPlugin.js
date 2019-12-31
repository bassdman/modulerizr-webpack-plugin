class ScopeScriptsPlugin {
    constructor(pluginconfig = {}) {
        this.scopedAttributeName = pluginconfig.scopedAttributeName || 'm-scoped';
        this.internal = true;
    }
    apply(compiler) {
        compiler.hooks.modulerizrReady.tap('ScopeScriptsPlugin', modulerizr => {
            modulerizr.store.$each('$.component.*', ($, currentFile, currentPath) => {
                const $scriptTags = $(`script[${this.scopedAttributeName}]`);
                $scriptTags.each((i, e) => {
                    const $currentScripts = $(e);

                    const scopedScript = `(function(window){
                        var _m = {
                            id: "${currentFile.id}",
                            name: "${currentFile.name}",
                            $el: document.getElementById("${currentFile.id}"),
                            attributes: ##component.attributes##,
                            slots: ##component.slots##
                        };
                        ${$currentScripts.html()}
                    })(window);`;
                    $currentScripts.html(scopedScript);
                });
            });
        });

        compiler.hooks.modulerizrAfterRender.tap('ScopeScriptsPlugin-afterRender', modulerizr => {
            modulerizr.store.$each(`$.src.*/script[${this.scopedAttributeName}]`, ($, currentFile, currentPath) => {
                const embeddedComponentId = $.parent('[data-component-instance]').attr('data-component-instance');
                const embeddedComponent = modulerizr.store.queryOne(`$.embeddedComponents.id_${embeddedComponentId}`);

                const replacedScript = $.html()
                    .replace('##component.attributes##', JSON.stringify(embeddedComponent.attributes))
                    .replace('##component.slots##', JSON.stringify(embeddedComponent.slots));

                $.html(replacedScript);
            });
        })

        compiler.hooks.modulerizrFinished.tap('ScopeScriptsPlugin-cleanup', modulerizr => {
            modulerizr.store.$each("$.src.*", ($, currentFile, currentPath, i) => {
                $(`[${this.scopedAttributeName}]`).removeAttr(this.scopedAttributeName);
            });
        })
    }
}

exports.ScopeScriptsPlugin = ScopeScriptsPlugin;