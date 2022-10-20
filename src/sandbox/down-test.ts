import { CustomRequest } from "../utils/CustomRequest";

const request = new CustomRequest ();
const test_url = 'https://blogger.googleusercontent.com/img/a/AVvXsEgwyiY-kBKczKKNZ2nWKGIuL-O2vi_du_7XhSSKGI_eDZfzWUNdX24kQPeJoOYM1pAmH1KaBHjJOcukSQz-Fsh2aI2v8wo9lJO9BpGiEJV_r8bgqpci2Mgs8hHPtHssBfwKk_eKwcxsvsxOmhVx3Q5J-FRT6_DAFjh0XcPlTuMrD7L6KWxtm-TYraPG';
request
    .download (test_url, './download/temp/Cat03.jpg')
    .then (() => {
        console.log('done');
    })
    .catch (err => {
        console.error (err);
    });