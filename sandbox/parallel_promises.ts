import * as cliProgress from "cli-progress";
import { DownloadProgressCallback } from "../src/utils/downloader.ts";

function fakeDownload(fakeCount: number, callback: DownloadProgressCallback) {
  return new Promise((resolve, _) => {
    let count = 10;
    const interval = setInterval(() => {
      count++;
      const p = 100 * (count / fakeCount);
      callback("Fake file", count, fakeCount, p);
      if (count > fakeCount) {
        clearInterval(interval);
        resolve(count);
      }
    }, Math.random() < 0.5 ? 100 : 50);
  });
}

// create new container
const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
  format: " {bar} | {filename} | {value}/{total}",
}, cliProgress.Presets.shades_grey);

const counts = [50, 10, 30];
const processes = [];
for (const count of counts) {
  const progress = multibar.create(count, 0, {
    filename: "fake-" + count + ".jpg",
  });
  const callback: DownloadProgressCallback = (_msg, curr, _total, _page) => {
    progress.update(curr);
  };
  processes.push(fakeDownload(count, callback));
}

processes.push(Promise.reject("Test reject"));

Promise.allSettled(processes).then((res) => {
  multibar.stop();
  console.log("Done", res);
}).catch((err) => {
  console.error(err);
  multibar.stop();
});
