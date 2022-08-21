"use strict";
exports.__esModule = true;
var MXScraper_1 = require("../MXScraper");
var Example_1 = require("../plugins/example/Example");
test('MXScraper should have more than 1 plugin', function () {
    var engine = new MXScraper_1.MXScraper();
    var plugins = engine.getAllPlugins();
    console.info('Loaded plugins :', plugins
        .map(function (plugin) { return plugin.unique_identifier; })
        .join(', '));
    expect(plugins.length).toBeGreaterThanOrEqual(1);
});
test('Registering duplicate ids should fail', function () {
    var engine = new MXScraper_1.MXScraper();
    try {
        engine.register(new Example_1.Example());
        fail('Registering duplicate ids did not fail');
    }
    catch (err) {
        expect(err).toBeDefined();
    }
});
