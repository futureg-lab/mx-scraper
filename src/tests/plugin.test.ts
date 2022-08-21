import { MXPlugin } from "../interfaces/MXPlugin";
import { MXScraper } from "../MXScraper";

test('MXScraper should have more than 1 plugin', () => {
    const engine = new MXScraper ();
    engine.initPlugins();
    const plugins = engine.getAllPlugins ();
    console.info(
        plugins
            .map((plugin : MXPlugin) => plugin.unique_identifier)
            .join(', ')
    );
    expect(plugins.length).toBeGreaterThanOrEqual(1);
});