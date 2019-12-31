const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const { foreachPromise } = require('../utils');


class PrerenderScriptPlugin {
    constructor(pluginconfig = {}) {
        this.serversideAttributeName = pluginconfig.scopedAttributeName || 'm-prerenderscript';
        this.internal = true;
    }
    apply(compiler) {
        compiler.hooks.modulerizrAfterRender.tapPromise('PrerenderScriptPlugin', async modulerizr => {
            return await modulerizr.src.$eachPromise(`script[${this.serversideAttributeName}]`, async($currentScript, currentFile, currentPath) => {
                const tempFileHash = crypto.createHash('md5').update($currentScript.html().trim()).digest("hex").substring(0, 8);
                const tempFilename = "./_temp/temp_" + tempFileHash + '.js';

                await fs.ensureDir(path.dirname(tempFilename));
                await fs.writeFile(tempFilename, $currentScript.html().trim());

                const returnValue = require(path.join(compiler.context, tempFilename));

                const data = typeof returnValue.data == 'function' ? returnValue.data() : returnValue.data;

                const embeddedComponentId = $currentScript.parent('[data-component-instance]').attr('data-component-instance');
                const embeddedComponent = modulerizr.store.queryOne(`$.embeddedComponents.id_${embeddedComponentId}`);
                const componentPrerenderData = modulerizr.store.queryOne(`$.component.id_${embeddedComponent.componentId}.preRenderData`) || {};

                const mappedData = Object.assign({}, componentPrerenderData, data);
                modulerizr.store.value(`$.component.id_${embeddedComponent.componentId}.preRenderData`, mappedData);
            });
        })

        compiler.hooks.modulerizrFinished.tapPromise('PrerenderScriptPlugin-cleanup', async(modulerizr) => {
            return modulerizr.src.$eachPromise(async $ => {
                $(`[${this.serversideAttributeName}]`).remove();
                await fs.remove('./_temp');
            });
        })
    }
}

exports.PrerenderScriptPlugin = PrerenderScriptPlugin;