import * as cliProgress from 'cli-progress';
import { DownloadProgressCallback } from '../utils/Downloader';

function fakeDownload (fake_counts : number, callback : DownloadProgressCallback) {
    return new Promise ((res, rej) => {
        let count = 10
        let interval = setInterval (() => {
            count++;
            const p = 100 * (count / fake_counts);
            callback ('Fake file', count, fake_counts, p);
            if (count > fake_counts) {
                clearInterval (interval);
                res (count);
            }
        }, Math.random() < 0.5 ? 100 : 50);
    });
}


// create new container
const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: ' {bar} | {filename} | {value}/{total}',
}, cliProgress.Presets.shades_grey);

const counts = [50, 10, 30];
const processes = [];
for (let count of counts) {
    const progress = multibar.create (count, 0, {
        filename : 'fake-' + count + '.jpg'
    });
    const callback : DownloadProgressCallback = (msg, curr, tot, p) => {
        progress.update (curr);
    };
    processes.push (fakeDownload (count, callback));
};

processes.push (Promise.reject('Test reject'));

Promise.allSettled (processes).then ((res) => {
    multibar.stop ();
    console.log ('Done', res);
}).catch (err => {
    console.error (err);
    multibar.stop ();
})