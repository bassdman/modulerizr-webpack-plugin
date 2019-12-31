const glob = require('glob');

function ensureArray(value) {
    if (!Array.isArray(value))
        return [value];

    return value;
}

function foreachPromise(items, fn) {
    let iterationItems = items;
    if (items.each && items.html && items.attr && items.val) {
        iterationItems = [];
        items.each((i, e) => iterationItems.push(e));
    }

    let i = -1;
    return iterationItems.reduce(function(promise, item) {
        return promise.then(function() {
            i++;
            return fn(item, i);
        });
    }, Promise.resolve());
}


function globFiles(src, rootPath) {
    const files = [];
    return foreachPromise(src, srcEntry => {
            return new Promise((resolve, reject) => {
                    glob(srcEntry, { root: rootPath }, (err, result) => {
                        resolve(result);
                    });
                })
                .then(filesGlob => files.push(filesGlob));
        })
        .then(() => {
            // schaut komisch aus, löst aber die Arrays in mehreren Hierarchien auf.
            return files.join(',').split(',');
        })
        .then((_files) => {
            if (_files.length == 1 && files[0] == '')
                return [];

            // schaut komisch aus, löst aber die Arrays in mehreren Hierarchien auf.
            return files.join(',').split(',');
        });
}

exports.globFiles = globFiles;
exports.ensureArray = ensureArray;
exports.foreachPromise = foreachPromise;