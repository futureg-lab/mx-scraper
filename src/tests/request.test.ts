import { CustomRequest, FlareSolverrProxyOption } from "../utils/CustomRequest";

test('Perform a get request without a proxy on example.com', async () => {
    const request = new CustomRequest();
    try {
        const text_response = await request.get('http://www.example.com/');
        expect(text_response).toContain('example');
    } catch (err) {
        fail(err);
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

test('Perform a get request using an existing session on example.com', async () => {
    const option : FlareSolverrProxyOption = {
        proxy_url : 'http://localhost:8191/v1'
    };

    const request = new CustomRequest(option);
    try {
        await request.initProxySession();
        expect(request.proxy.session_id).toBeDefined();
    
        const text_response = await request.get('http://www.example.com/');
        await request.destroyProxySession();
        expect(request.proxy.session_id).toBeUndefined();
        
        expect(text_response).toContain('example');
    } catch (err) {
        fail(err);
    }
});