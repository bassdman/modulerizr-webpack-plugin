const { ModulerizrCore } = require('./plugins/ModulerizrCore');
const { InitComponentsPlugin } = require("./plugins/InitComponentsPlugin");
const { InitSrcPlugin } = require('./plugins/InitSrcPlugin');
const { InitEmbeddedComponentsPlugin } = require("./plugins/InitEmbeddedComponentsPlugin")
const { PreRenderPlugin } = require("./plugins/PreRenderPlugin")
const { DebugPlugin } = require("./plugins/DebugPlugin")
const { ScopeStylesPlugin } = require("./plugins/ScopeStylesPlugin");
const { ScopeScriptsPlugin } = require("./plugins/ScopeScriptsPlugin");
const { OnceAttributePlugin } = require("./plugins/OnceAttributePlugin");

class ModulerizrWebpackPlugin {
    constructor(pluginconfig = {}) {
        this.config = pluginconfig;
    }
    async apply(compiler) {
        const store = {};
        new ModulerizrCore(this.config).apply(compiler, store);
        new InitComponentsPlugin().apply(compiler, store, this.config);
        new InitSrcPlugin().apply(compiler, store, this.config);
        new InitEmbeddedComponentsPlugin().apply(compiler, store, this.config);
        new PreRenderPlugin().apply(compiler, store);
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
exports.DebugPlugin = DebugPlugin;