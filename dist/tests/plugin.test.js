"use strict";
exports.__esModule = true;
var MXScraper_1 = require("../MXScraper");
test('MXScraper should have more than 1 plugin', function () {
    var engine = new MXScraper_1.MXScraper();
    engine.initPlugins();
    var plugins = engine.getAllPlugins();
    console.info(plugins
        .map(function (plugin) { return plugin.unique_identifier; })
        .join(', '));
    expect(plugins.length).toBeGreaterThanOrEqual(1);
});
