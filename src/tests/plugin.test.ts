import { MXPlugin } from "../interfaces/MXPlugin";
import { MXScraper } from "../MXScraper";
import { Example } from "../plugins/example/Example";

test('MXScraper should have more than 1 plugin', () => {
    const engine = new MXScraper ();
    const plugins = engine.getAllPlugins ();
    console.info(
        'Loaded plugins :',
        plugins
            .map((plugin : MXPlugin) => plugin.unique_identifier)
            .join(', ')
    );
    expect(plugins.length).toBeGreaterThanOrEqual(1);
});


test('Registering duplicate ids should fail', () => {
    const engine = new MXScraper ();
    try {
        engine.register(new Example());
        fail('Registering duplicate ids did not fail');
    } catch (err) {
        expect(err).toBeDefined();
    }
});