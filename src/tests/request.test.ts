import { CustomRequest, FlareSolverrProxyOption } from "../utils/CustomRequest";

test('Perform a get request without a proxy on example.com', async () => {
    const request = new CustomRequest();
    const text_response = await request.get('http://www.example.com/');
    expect(text_response).toContain('example');
});

test('Perform a get request using a proxy on example.com', async () => {
    const option : FlareSolverrProxyOption = {
        proxy_url : 'http://localhost:8191/v1'
    };
    const request = new CustomRequest(option);
    const text_response = await request.get('http://www.example.com/');
    expect(text_response).toContain('example');
});