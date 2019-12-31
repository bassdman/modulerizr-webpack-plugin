const { AsyncSeriesHook, SyncHook } = require('tapable');
const colors = require('colors/safe');
const jp = require('jsonpath');
const path = require('path')
const cheerio = require('cheerio');
const getLogger = require('webpack-log');
const HtmlWebpackPlugin = require('html-webpack-plugin');

class ModulerizrCore {
    constructor(pluginconfig = {}) {
        this.config = pluginconfig;
    }
    async apply(compiler) {
        compiler.hooks.modulerizrInit = new AsyncSeriesHook(['modulerizr']);
        compiler.hooks.modulerizrReady = new AsyncSeriesHook(['modulerizr']);
        compiler.hooks.modulerizrRender = new AsyncSeriesHook(['modulerizr']);
        compiler.hooks.modulerizrAfterRender = new AsyncSeriesHook(['modulerizr']);
        compiler.hooks.compilationModulerizr = new SyncHook(['modulerizr']);

        compiler.hooks.emitModulerizr = new AsyncSeriesHook(['compilation', 'modulerizr']);
        compiler.hooks.modulerizrFinished = new AsyncSeriesHook(['stats', 'modulerizr']);

        const modulerizr = new Modulerizr(this.config, compiler);

        modulerizr.log(`The rootPath is: ${compiler.context}`);

        compiler.hooks.run.tapPromise('Modulerizr-Core-Execute', async(compiler) => {
            if (modulerizr.config.plugins) {
                if (!Array.isArray(modulerizr.config.plugins))
                    throw new Error('config.plugins must be of type Array, but is type of ' + typeof modulerizr.config.plugins);

                modulerizr.config.plugins.forEach(plugin => {
                    plugin.apply(compiler);
                });
            }

            await compiler.hooks.modulerizrInit.promise(modulerizr);
            await compiler.hooks.modulerizrReady.promise(modulerizr);
            await compiler.hooks.modulerizrRender.promise(modulerizr);
            await compiler.hooks.modulerizrAfterRender.promise(modulerizr);
            await compiler.hooks.modulerizrFinished.promise(modulerizr);
        });
    }
}





function Modulerizr(_config = {}, compiler) {
    console.log(compiler.context)
    const config = Object.assign({}, {
        dest: path.resolve(compiler.context, "dest"),
        defaultComponentWrapper: "div",
        maxRecursionLevel: 100
    }, _config);

    const store = {};
    const log = getLogger({
        name: config.logName || 'modulerizr',
        level: config.logLevel || 'trace',
        timestamp: config.logTimeStamp || false
    });


    const modulerizr = {
        log(message, logLevel = 'debug') {
            if (!config.debug)
                return;

            const availableLogLevels = ['debug', 'warn', 'error', 'info', 'trace'];

            if (!availableLogLevels.includes(logLevel))
                throw new Error(colors.red(`Error in function modulerizr.log(someText,logLevel): Loglevel "${logLevel}" does not exist. It must be one of the followings: ${availableLogLevels.join(',')}"`))

            log[logLevel](message)

        },
        config,
        src: {
            $each(fnOrSelector, _fn) {
                const selector = _fn == null ? null : fnOrSelector;
                const fn = _fn == null ? fnOrSelector : _fn;

                compiler.hooks.compilation.tap('ModulerizrEachSrcFile', compilation => {
                    HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tap('ModulerizrEachSrcFile', (htmlPluginData) => {
                        const $el = cheerio.load(htmlPluginData.html);

                        if (selector == null) {
                            fn($el, htmlPluginData);
                        } else {
                            const $tags = $el(selector);

                            $tags.each((i, el) => {
                                const $currentTag = $el(el);
                                fn($currentTag, htmlPluginData);
                            });
                        }

                        const replacedHtml = $el.html(':root');

                        htmlPluginData.html = replacedHtml;
                    })
                })
            },
            $eachPromise(fnOrSelector, _fn) {
                const selector = _fn == null ? null : fnOrSelector;
                const fn = _fn == null ? fnOrSelector : _fn;

                compiler.hooks.compilation.tap('ModulerizrEachSrcFile', compilation => {
                    HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise('ModulerizrEachSrcFile', async htmlPluginData => {
                        const $el = cheerio.load(htmlPluginData.html);

                        if (selector == null) {
                            fn($el, htmlPluginData);
                        } else {
                            const $tags = $el(selector);

                            $tags.each((i, el) => {
                                const $currentTag = $el(el);
                                fn($currentTag, htmlPluginData);
                            });
                        }

                        const replacedHtml = $el.html(':root');

                        htmlPluginData.html = replacedHtml;
                    })
                })
            }
        },
        save(filePath, newContent) {
            compiler.hooks.compilation.tap('HtmlReplaceWebpackPlugin', compilation => {
                HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tap('ModulerizrSaveFile', (htmlPluginData) => {
                    const replacement = newContent.html ? newContent.html(':root') : newContent;

                    const currentFilePath = htmlPluginData.plugin.options.template.split('!')[1];

                    if (filePath == undefined || filePath !== currentFilePath)
                        return;

                    htmlPluginData.html = replacement;
                })
            })

        },
    }

    modulerizr.store = {
        query(query, count) {
            if (query == null)
                throw new Error('Modulerizr.store.query(query[,count]): query is undefined');

            return jp.query(store, query.toLowerCase(), count);
        },
        queryOne(query, count) {
            if (query == null)
                throw new Error('Modulerizr.store.query(query[,count]): query is undefined');

            return jp.query(store, query.toLowerCase(), count)[0];
        },
        apply(query, fn) {
            if (query == null)
                throw new Error('Modulerizr.store.apply(query,fn): query is undefined');

            if (fn == null)
                throw new Error('Modulerizr.store.apply(query,fn): fn is undefined');

            jp.apply(store, query.toLowerCase(), fn);
        },
        value(query, value) {
            if (query == null)
                throw new Error('Modulerizr.store.value(query): query is undefined');

            jp.value(store, query.toLowerCase(), value);
        },
        paths(query, count) {
            if (query == null)
                throw new Error('Modulerizr.store.paths(query[,count]): query is undefined');

            return jp.paths(store, query.toLowerCase(), count);
        },
        nodes(query, count) {
            if (query == null)
                throw new Error('Modulerizr.store.nodes(query[,count]): query is undefined');

            return jp.nodes(store, query.toLowerCase(), count);
        },
        parent(query) {
            if (query == null)
                throw new Error('Modulerizr.store.parent(query): query is undefined');

            return jp.parent(store, query.toLowerCase(), count);
        },
        each(query, fn) {
            if (query == null)
                throw new Error('Modulerizr.store.parent(query): query is undefined');

            const nodes = jp.nodes(store, query.toLowerCase()) || [];

            return nodes.forEach((node, i) => {
                const _path = node.path.join('.');

                fn(node.value, _path, i);
            })
        },
        $each(_query, fn) {
            if (_query == null)
                throw new Error('Modulerizr.store.parent(query): query is undefined');

            const query = _query.split('/')[0];
            const selector = _query.split('/').length > 1 ? _query.split('/')[1] : undefined;

            const nodes = jp.nodes(store, query.toLowerCase()) || [];

            return nodes.forEach((node, i) => {
                const _path = node.path.join('.');
                const $el = node.value.content ? cheerio.load(node.value.content) : undefined;

                if (selector == null) {
                    fn($el, node.value, _path, i);
                } else {
                    const $tags = $el(selector);

                    $tags.each((i, el) => {
                        const $currentTag = $el(el);
                        fn($currentTag, $el, _path, i);

                    });
                }

                if ($el !== undefined) {
                    this.value(`${_path}.content`, $el.html(':root'))
                    modulerizr.save(node.value.absolutePath, $el);
                }
            })
        }
    }
    return modulerizr;
}

exports.Modulerizr = Modulerizr;
exports.ModulerizrCore = ModulerizrCore;