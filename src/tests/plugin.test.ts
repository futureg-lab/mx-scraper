import { MXPlugin } from "../interfaces/MXPlugin";
import { MXScraper } from "../MXScraper";
import { Example } from "../plugins/example/Example";

test('MXScraper should have more than 1 plugin', async () => {
    try {
        const engine = new MXScraper ();
        await engine.initPlugins ();
        const plugins = engine.getAllPlugins ();
        console.info(
            'Loaded plugins :',
            plugins
                .map((plugin : MXPlugin) => plugin.constructor.name)
                .join(', ')
        );
        expect(plugins.length).toBeGreaterThanOrEqual(1);
    } catch (err) {
        fail(err);
    }
});


test('Registering duplicate ids should fail', async () => {
    try {
        const engine = new MXScraper ();
        await engine.initPlugins ();
        await engine.register(new Example());
        fail('Registering duplicate ids did not fail');
    } catch (err) {
        expect(err).toBeDefined();
    }
});