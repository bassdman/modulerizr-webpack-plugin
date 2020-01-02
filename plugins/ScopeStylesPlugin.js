const cheerio = require('cheerio');
const csstree = require('css-tree');

class ScopeStylesPlugin {
    constructor(pluginconfig = {}) {
        this.scopedAttributeName = pluginconfig.scopedAttributeName || 'm-scoped';
        this.internal = true;
    }
    apply(compiler) {
        compiler.hooks.modulerizrComponentInitialized.tap('ScopeStylesPlugin', ($, component, modulerizr) => {
            $('*').not('style,script').attr('data-v-' + component.id, "")

            const $styleTags = $(`style[${this.scopedAttributeName}]`);

            $styleTags.each((i, e) => {
                const $currentStyles = $(e);
                const ast = csstree.parse($currentStyles.html());
                csstree.walk(ast, function(node) {
                    if (node.type === 'ClassSelector') {
                        node.name = `${node.name}[data-v-${component.id}]`;
                    }
                });
                const parsedStyles = csstree.generate(ast);
                $currentStyles.html(parsedStyles);
            });
            $styleTags.removeAttr(this.scopedAttributeName);
        });
    }
}

exports.ScopeStylesPlugin = ScopeStylesPlugin;