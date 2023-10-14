const Puppeteer = require("puppeteer");
const path = require("path");
const fsextra = require("fs-extra");
const { execSync } = require("child_process");

const exec_path_dest = require("./package.json").pkg.outputPath;
const build_command = require("./package.json").scripts.build;
const browser_path_dest = path.join(exec_path_dest, "browser");

(async () => {
  try {
    console.log("Downloading ...");
    let browser_path_origin = Puppeteer.executablePath();
    if (!fsextra.existsSync(browser_path_origin)) {
      const revision = "94.0a1";
      const fetcher = Puppeteer.createBrowserFetcher({});
      const infos = await fetcher
        .download(revision, (x, y) => {
          const chunk = Math.round(100 * x / Math.max(y, 0.1));
          console.log(chunk + " %");
        });

      if (!infos) {
        throw Error("Download failed");
      }

      const download_path = infos.executablePath;
      console.log("Download complete ! " + download_path);
      browser_path_origin = download_path;
    }

    console.log("Copy browser to " + browser_path_dest);
    fsextra.copySync(path.dirname(browser_path_origin), browser_path_dest);

    console.log("Building app with pkg ");
    const std = execSync(build_command);
    console.info(std.toString());
    console.log("Done !");
    console.info("Executable path: ", exec_path_dest);
    console.info("Browser path: ", browser_path_dest);
  } catch (err) {
    console.error("Download or build failed ! ", err);
  }
})();
