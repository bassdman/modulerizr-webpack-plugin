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
        compiler.hooks.modulerizrComponentInitialized = new AsyncSeriesHook(['$component', 'component', 'modulerizr']);
        compiler.hooks.modulerizrFileRendered = new AsyncSeriesHook(['$file', 'srcFile', 'modulerizr']);
        compiler.hooks.modulerizrFileFinished = new AsyncSeriesHook(['$file', 'srcFile', 'modulerizr']);
        compiler.hooks.modulerizrRenderFile = new AsyncSeriesHook(['$', 'srcFile', 'modulerizr']);
        compiler.hooks.modulerizrFinished = new AsyncSeriesHook(['modulerizr', 'compilation']);

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

            compiler.hooks.compilation.tap('ModulerizrPreRenderPlugin', compilation => {
                const nrOfFiles = modulerizr.store.queryOne('nrOfFiles');
                let i = 0;
                HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise('ModulerizrPreRenderPlugin', async(htmlPluginData) => {
                    const $ = cheerio.load(htmlPluginData.html);
                    await compiler.hooks.modulerizrRenderFile.promise($, htmlPluginData, modulerizr);
                    htmlPluginData.html = $.html(':root');

                    if (i == nrOfFiles - 1) {
                        await compiler.hooks.modulerizrFinished.promise(modulerizr, compilation);
                        console.log('bin driiine')
                    }
                    i++;
                })
            });
        });
    }
}





function Modulerizr(_config = {}, compiler) {
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
        debug() {
            console.log(store);
            return store;
        },
        queryOne(query, count) {
            if (query == null)
                throw new Error('Modulerizr.store.query(query[,count]): query is undefined');

            return jp.query(store, query.toLowerCase(), count)[0];
        },
        value(query, value) {
            if (query == null)
                throw new Error('Modulerizr.store.value(query): query is undefined');

            jp.value(store, query.toLowerCase(), value);
        },
        nodes(query, count) {
            if (query == null)
                throw new Error('Modulerizr.store.nodes(query[,count]): query is undefined');

            return jp.nodes(store, query.toLowerCase(), count);
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
    }
    return modulerizr;
}

exports.Modulerizr = Modulerizr;
exports.ModulerizrCore = ModulerizrCore;