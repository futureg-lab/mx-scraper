import { CustomRequest, FlareSolverrProxyOption } from "../../utils/CustomRequest";

test('Perform a get request without a proxy on example.com', async () => {
    const request = new CustomRequest();
    try {
        const text_response = await request.get('http://www.example.com/');
        expect(text_response).toContain('example');
    } catch (err) {
        fail(err);
    }
});

test('Perform a get request with headless_mode=true on example.com', async () => {
    const request = new CustomRequest();
    request.enableRendering ();
    // by default reusing browser instance is disabled i.e. no need to free resources with request.destroy()
    // which is fine in most cases
    // But for optimal uses, we might want to use a single browser instance throughout the app lifecycle
    // in this case, we have to free the resources ourselves
    request.enableReUsingBrowserInstance ();
    try {
        const text_response = await request.get('http://www.example.com/');
        expect(text_response).toContain('example');
    } catch (err) {
        fail(err);
    } finally {
        await request.destroy();
    }
});

test('Perform a get request using a proxy on example.com', async () => {
    const option : FlareSolverrProxyOption = {
        proxy_url : 'http://localhost:8191/v1'
    };
    const request = new CustomRequest(option);
    try {
        const text_response = await request.get('http://www.example.com/');
        expect(text_response).toContain('example');
    } catch (err) {
        fail(err);
    }
});

test('Browser context should not conflict when request is destroyed', async () => {
    try {
        let n_instances = 3;
        const target_url = 'http://www.example.com/';
        while (n_instances--) {
            const request = new CustomRequest ();
            
            request.enableRendering ();
            request.enableReUsingBrowserInstance ();
            const html = await request.get (target_url);
            expect(html).toContain('example');
           
            await request.destroy ();
        }
    } catch (err) {
        fail (err);
    }
});

test('Perform a get request on example.com', async () => {
    const option : FlareSolverrProxyOption = {
        proxy_url : 'http://localhost:8191/v1'
    };

    const request = new CustomRequest(option);
    try {
        const text_response = await request.get('http://www.example.com/');
        expect(text_response).toContain('example');
    } catch (err) {
        fail(err);
    }
});