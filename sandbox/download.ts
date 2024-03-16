import { UniqueBrowser } from "../src/utils/browser/unique_browser.ts";
import { CustomRequest } from "../src/utils/custom_request.ts";

try {
  const request = new CustomRequest();
  request.enableRendering();
  request.enableReUsingBrowserInstance();

  const testUrl =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/A-Cat.jpg/800px-A-Cat.jpg";

  await request.download(testUrl, "./simple_download.jpg");
  await request.downloadImage(testUrl, "./browser_download.jpg");
} catch (err) {
  throw err;
} finally {
  await UniqueBrowser.destroy();
}
