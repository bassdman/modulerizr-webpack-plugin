const jp = require('jsonpath');

const store = {};

module.exports = {
    reset() {
        store = {};
    },
    root() {
        return store;
    },
    queryOne(query, count) {
        if (query == null)
            throw new Error('Store.query(query[,count]): query is undefined');

        return jp.query(store, query.toLowerCase(), count)[0];
    },
    value(query, value) {
        if (query == null)
            throw new Error('Store.value(query): query is undefined');

        jp.value(store, query.toLowerCase(), value);
    },
    nodes(query, count) {
        if (query == null)
            throw new Error('Store.nodes(query[,count]): query is undefined');

        return jp.nodes(store, query.toLowerCase(), count);
    },
    each(query, fn) {
        if (query == null)
            throw new Error('Store.parent(query): query is undefined');

        const nodes = jp.nodes(store, query.toLowerCase()) || [];

        return nodes.forEach((node, i) => {
            const _path = node.path.join('.');

            fn(node.value, _path, i);
        })
    },
}