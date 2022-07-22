"use strict";
exports.__esModule = true;
exports.MXScraper = void 0;
var MXScraper = /** @class */ (function () {
    function MXScraper() {
    }
    MXScraper.prototype.initPlugins = function () {
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
