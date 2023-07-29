// this will succeed
const y = [7, 8, 9];
document.getElementById("content_b").innerHTML = y.join(" - ") +
  " did it change ?";

// this will fail in JSDOM
// since the rendered html is returned before this function call
// weirdly enough, JSDOM will wait for this script to load
setTimeout(() => {
  document.getElementById("content_b").innerHTML = "changed again !";
}, 5000);
