const cheerio = require('cheerio');
const csstree = require('css-tree');

class ScopeStylesPlugin {
    constructor(pluginconfig = {}) {
        this.scopedAttributeName = pluginconfig.scopedAttributeName || 'm-scoped';
        this.internal = true;
    }
    apply(compiler) {
        compiler.hooks.modulerizrReady.tap('ScopeStylesPlugin', modulerizr => {
            return modulerizr.store.$each("$.component.*", ($, currentFile, currentPath, i) => {
                $('*').not('style,script').attr('data-v-' + currentFile.id, "")

                const $styleTags = $(`style[${this.scopedAttributeName}]`);
                $styleTags.each((i, e) => {
                    const $currentStyles = $(e);
                    const ast = csstree.parse($currentStyles.html());
                    csstree.walk(ast, function(node) {
                        if (node.type === 'ClassSelector') {
                            node.name = `${node.name}[data-v-${currentFile.id}]`;
                        }
                    });
                    const parsedStyles = csstree.generate(ast);
                    $currentStyles.html(parsedStyles);
                });
                $styleTags.removeAttr(this.scopedAttributeName);

                return;
            })
        });
    }
}

exports.ScopeStylesPlugin = ScopeStylesPlugin;