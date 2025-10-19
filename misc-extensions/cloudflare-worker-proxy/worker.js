/**
 * A simple Cloudflare Worker proxy, very easy to port to other providers
 *
 * * Usage:
 *   curl [..] {BASE_URL}?url={TARGET}
 *
 * * Example:
 *
 *   curl -X GET "{BASE_URL}?url=https://postman-echo.com/get?foo=bar" -d "{"a": "b"}" -H "Content-Type: application/json"
 * ```json
 * {
 *  "args":{"foo":"bar"},
 *  "headers":{"host":"postman-echo.com","user-agent":"curl/8.14.1", .., "content-type":"application/json"},
 *  "url":"https://postman-echo.com/get?foo=bar"
 * }
 * ```
 */

export default {
  async fetch(request) {
    try {
      const incomingUrl = new URL(request.url);
      const targetParam = incomingUrl.searchParams.get("url");

      if (!targetParam) {
        return new Response("Target unspecified: missing ?url= parameter", {
          status: 400,
        });
      }

      const target = new URL(targetParam);
      for (const [key, value] of incomingUrl.searchParams.entries()) {
        if (key !== "url") {
          target.searchParams.set(key, value);
        }
      }

      const init = {
        method: request.method,
        headers: new Headers(request.headers),
        // redirect: "manual" // follow is default
      };

      if (!["GET", "HEAD"].includes(request.method)) {
        init.body = request.body;
      }

      const response = await fetch(target.toString(), init);
      const responseHeaders = new Headers(response.headers);

      /*
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Headers", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      */

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, { status: 500 });
    }
  },
};
