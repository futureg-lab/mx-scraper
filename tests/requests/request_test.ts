import {
  CustomRequest,
  FlareSolverrProxyOption,
} from "../../src/utils/custom_request.ts";
import { assertStringIncludes } from "std/assert/mod.ts";

Deno.test("Perform a get request without a proxy on example.com", async () => {
  const request = new CustomRequest();
  const textResponse = await request.get("http://www.example.com/");
  assertStringIncludes(textResponse, "example");
});

Deno.test("Perform a get request using a proxy on example.com", async () => {
  const option: FlareSolverrProxyOption = {
    proxyUrl: "http://localhost:8191/v1",
  };
  const request = new CustomRequest(option);
  const textResponse = await request.get("http://www.example.com/");
  assertStringIncludes(textResponse, "example");
});

Deno.test("Perform a get request with headless_mode=true on example.com", async () => {
  const request = new CustomRequest();
  request.enableRendering();
  request.enableReUsingBrowserInstance();
  try {
    const textResponse = await request.get("http://www.example.com/");
    assertStringIncludes(textResponse, "example");
  } catch (err) {
    throw err;
  } finally {
    await request.destroy();
  }
});

Deno.test("Browser context should not conflict when request is destroyed", async () => {
  let nInstances = 3;
  const targetUrl = "http://www.example.com/";
  while (nInstances--) {
    const request = new CustomRequest();
    try {
      request.enableRendering();
      request.enableReUsingBrowserInstance();

      const html = await request.get(targetUrl);

      assertStringIncludes(html, "example");
    } catch (err) {
      throw err;
    } finally {
      await request.destroy();
    }
  }
});

Deno.test("Perform a get request on example.com", async () => {
  const option: FlareSolverrProxyOption = {
    proxyUrl: "http://localhost:8191/v1",
  };

  const request = new CustomRequest(option);
  const textResponse = await request.get("http://www.example.com/");
  assertStringIncludes(textResponse, "example");
});
