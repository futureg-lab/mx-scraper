import { CustomRequest } from "../utils/CustomRequest";

const request = new CustomRequest();
request.enableRendering();

// create a mock html that uses javascript and serve with http-server first

// request.get ('http://localhost:8080')
//     .then (html => {
//         console.log(html);
//     });

(async () => {
  await request.downloadImage(
    "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
    "./test.jpg",
  );
})();
