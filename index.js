const { ModulerizrCore } = require('./plugins/ModulerizrCore');
const { InitComponentsPlugin } = require("./plugins/InitComponentsPlugin");
const { InitSrcPlugin } = require('./plugins/InitSrcPlugin');
const { InitEmbeddedComponentsPlugin } = require("./plugins/InitEmbeddedComponentsPlugin")
const { PreRenderPlugin } = require("./plugins/PreRenderPlugin")
const { ScopeStylesPlugin } = require("./plugins/ScopeStylesPlugin");
const { ScopeScriptsPlugin } = require("./plugins/ScopeScriptsPlugin");
const { OnceAttributePlugin } = require("./plugins/OnceAttributePlugin");

class ModulerizrWebpackPlugin {
    constructor(pluginconfig = {}) {
        this.config = pluginconfig;
    }
    async apply(compiler) {
        new ModulerizrCore(this.config).apply(compiler);
        new InitComponentsPlugin().apply(compiler);
        new InitSrcPlugin().apply(compiler);
        new InitEmbeddedComponentsPlugin().apply(compiler);
        new PreRenderPlugin().apply(compiler);
        new OnceAttributePlugin().apply(compiler);
        new ScopeStylesPlugin().apply(compiler);
        new ScopeScriptsPlugin().apply(compiler);

    }
}

exports.ModulerizrWebpackPlugin = ModulerizrWebpackPlugin;
exports.ModulerizrCore = ModulerizrCore;
exports.InitComponentsPlugin = InitComponentsPlugin;
exports.InitSrcPlugin = InitSrcPlugin;
exports.InitEmbeddedComponentsPlugin = InitEmbeddedComponentsPlugin;
exports.PreRenderPlugin = PreRenderPlugin;
exports.ScopeStylesPlugin = ScopeStylesPlugin;
exports.ScopeScriptsPlugin = ScopeScriptsPlugin;
exports.OnceAttributePlugin = OnceAttributePlugin;