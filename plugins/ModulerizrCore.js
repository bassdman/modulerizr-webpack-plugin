const { AsyncSeriesHook, SyncHook } = require('tapable');
const colors = require('colors/safe');
const path = require('path')
const cheerio = require('cheerio');
const getLogger = require('webpack-log');
const HtmlWebpackPlugin = require('html-webpack-plugin');

class ModulerizrCore {
    constructor(pluginconfig = {}) {
        this.config = pluginconfig;
    }
    async apply(compiler, store) {
        compiler.hooks.modulerizrInit = new AsyncSeriesHook(['modulerizr']);
        compiler.hooks.modulerizrComponentInitialized = new AsyncSeriesHook(['$component', 'component', 'modulerizr']);
        compiler.hooks.modulerizrTriggerRenderFile = new AsyncSeriesHook(['$', 'srcFile', 'modulerizr']);
        compiler.hooks.modulerizrPreRenderFile = new AsyncSeriesHook(['$file', 'srcFile']);
        compiler.hooks.modulerizrFileRendered = new AsyncSeriesHook(['$file', 'srcFile', 'modulerizr']);
        compiler.hooks.modulerizrFileFinished = new AsyncSeriesHook(['$file', 'srcFile', 'modulerizr']);
        compiler.hooks.modulerizrFinished = new AsyncSeriesHook(['modulerizr', 'compilation']);

        const modulerizr = new Modulerizr(this.config, compiler);

        modulerizr.log(`The rootPath is: ${compiler.context}`);

        compiler.hooks.run.tapPromise('Modulerizr-Core-Execute', async(compiler) => {
            if (modulerizr.config.plugins) {
                if (!Array.isArray(modulerizr.config.plugins))
                    throw new Error('config.plugins must be of type Array, but is type of ' + typeof modulerizr.config.plugins);

                modulerizr.config.plugins.forEach(plugin => {
                    plugin.apply(compiler, store);
                });
            }

            await compiler.hooks.modulerizrInit.promise(modulerizr);
            compiler.hooks.compilation.tap('ModulerizrPreRenderPlugin', compilation => {
                let i = 0;
                HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise('ModulerizrPreRenderPlugin', async(htmlPluginData) => {
                    const $ = cheerio.load(htmlPluginData.html);
                    await compiler.hooks.modulerizrTriggerRenderFile.promise($, htmlPluginData, modulerizr);
                    htmlPluginData.html = $.html(':root');

                    if (i == store.nrOfFiles - 1) {
                        await compiler.hooks.modulerizrFinished.promise(modulerizr, compilation);
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
        }
    }

    return modulerizr;
}

exports.Modulerizr = Modulerizr;
exports.ModulerizrCore = ModulerizrCore;