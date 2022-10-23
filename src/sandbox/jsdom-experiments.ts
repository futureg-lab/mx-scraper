import {JSDOM} from "jsdom";

const dom = new JSDOM(`
    <!DOCTYPE html>
        <p>Hello world</p>
        <div id="smth">Will be modifed</div>
        <script type="text/javascript">
            document.getElementById("smth").textContent = "Has been modified";
        </script>
`, { 
    runScripts: "dangerously",
    pretendToBeVisual : true
});



console.log(dom.window.document.querySelector("p").textContent); // "Hello world"
console.log(dom.window.document.getElementById("smth").textContent); // "Has been modified"


console.log("Test from url");
JSDOM.fromURL("https://example.com/", {runScripts : "dangerously"}).then(dom => {
  console.log(dom.serialize());
});