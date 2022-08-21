"use strict";
exports.__esModule = true;
exports.MXScraper = void 0;
var Example_1 = require("./plugins/example/Example");
var NHentai_1 = require("./plugins/nhentai/NHentai");
var environement_1 = require("./utils/environement");
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
        this.register(new NHentai_1.NHentai());
    };
    /**
     * @param plugin Plugin to register
     */
    MXScraper.prototype.register = function (plugin) {
        var current_id = plugin.unique_identifier;
        if (environement_1.config.PLUGIN_PROXY_ENABLE[current_id]) {
            plugin.config({
                useFlareSolverr: true,
                enableUniqueSession: true
            });
        }
        // duplicate id check
        var list = this.plugins.map(function (plugin) { return plugin.unique_identifier; });
        if (list.includes(current_id))
            throw Error('Duplicate id : Unable de register plugin id ' + current_id);
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
     * @param id plugin unique id
     * @returns
     */
    MXScraper.prototype.getPluginByIdentifier = function (id) {
        var res = this.plugins.filter(function (plugin) { return plugin.unique_identifier == id; });
        if (res.length == 0)
            return null;
        return res[0];
    };
    /**
     * Get a list of all plugins available
     */
    MXScraper.prototype.getAllPlugins = function () {
        return this.plugins;
    };
    return MXScraper;
}());
exports.MXScraper = MXScraper;
