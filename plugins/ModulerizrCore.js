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
    async apply(compiler) {
        compiler.hooks.modulerizrInit = new AsyncSeriesHook(['context']);
        compiler.hooks.modulerizrComponentInitialized = new AsyncSeriesHook(['$component', 'component', 'context']);
        compiler.hooks.modulerizrTriggerRenderFile = new AsyncSeriesHook(['$', 'srcFile', 'context']);
        compiler.hooks.modulerizrPreRenderFile = new AsyncSeriesHook(['$file', 'srcFile', 'context']);
        compiler.hooks.modulerizrFileRendered = new AsyncSeriesHook(['$file', 'srcFile', 'context']);
        compiler.hooks.modulerizrFileFinished = new AsyncSeriesHook(['$file', 'srcFile', 'context']);
        compiler.hooks.modulerizrFinished = new AsyncSeriesHook(['context', 'compilation']);

        const context = getContext(compiler, this.config);

        context.logger.debug(`The rootPath is: ${compiler.context}`);

        compiler.hooks.run.tapPromise('Modulerizr-Core-Execute', async(compiler) => {
            if (context.config.plugins) {
                if (!Array.isArray(context.config.plugins))
                    throw new Error('config.plugins must be of type Array, but is type of ' + typeof context.config.plugins);

                context.config.plugins.forEach(plugin => {
                    plugin.apply(compiler, context);
                });
            }

            await compiler.hooks.modulerizrInit.promise(context);
            compiler.hooks.compilation.tap('ModulerizrPreRenderPlugin', compilation => {
                let i = 0;
                HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise('ModulerizrPreRenderPlugin', async(htmlPluginData) => {
                    const $ = cheerio.load(htmlPluginData.html);
                    await compiler.hooks.modulerizrTriggerRenderFile.promise($, htmlPluginData, context);
                    htmlPluginData.html = $.html(':root');

                    if (i == context.nrOfFiles - 1) {
                        await compiler.hooks.modulerizrFinished.promise(context, compilation);
                    }
                    i++;
                })
            });
        });
    }
}


function getContext(compiler, _config) {
    const logger = getLogger({
        name: _config.logName || 'modulerizr',
        level: _config.logLevel || 'trace',
        timestamp: _config.logTimeStamp || false
    });
    const config = Object.assign({}, {
        dest: path.resolve(compiler.context, "dest"),
        defaultComponentWrapper: "div",
        maxRecursionLevel: 100
    }, _config);


    const context = {
        config,
        logger,
        embeddedComponents: [],
        components: []
    }

    return context;
}

exports.ModulerizrCore = ModulerizrCore;