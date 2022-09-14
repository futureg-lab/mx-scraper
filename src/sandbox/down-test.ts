import { CustomRequest } from "../utils/CustomRequest";

const request = new CustomRequest ();
const test_url = 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg';
request
    .download (test_url, './download/temp/Cat03.jpg')
    .then (() => {
        console.log('done');
    })
    .catch (err => {
        console.error (err);
    });