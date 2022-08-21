"use strict";
exports.__esModule = true;
exports.config = void 0;
var config = {
    CLOUDFARE_PROXY_HOST: 'http://localhost:8191/v1',
    LOAD_PLUGINS: [
        'NHentai'
    ],
    PLUGIN_PROXY_ENABLE: {
        'nhentai': true
    },
    CLOUDFARE_MAX_TIMEOUT: 60000
};
exports.config = config;
