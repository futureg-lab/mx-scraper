"use strict";
exports.__esModule = true;
exports.MXScraper = void 0;
var Example_1 = require("./plugins/example/Example");
var MXScraper = /** @class */ (function () {
    function MXScraper() {
        this.plugins = [];
        this.initPlugins();
    }
    /**
     * Register avalaible plugins
     */
    MXScraper.prototype.initPlugins = function () {
        this.register(new Example_1.Example());
    };
    /**
     * @param plugin Plugin to register
     */
    MXScraper.prototype.register = function (plugin) {
        this.plugins.push(plugin);
    };
    /**
     * Search plugins for a specific url
     * @param url Target url
     * @returns An array of plugins
     */
    MXScraper.prototype.searchPluginFor = function (url, exact_match) {
        if (exact_match === void 0) { exact_match = false; }
        return [];
    };
    /**
     * Get a list of all plugins available
     */
    MXScraper.prototype.getAllPlugins = function () {
        return [];
    };
    return MXScraper;
}());
exports.MXScraper = MXScraper;
