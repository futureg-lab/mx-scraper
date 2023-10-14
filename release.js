const { execSync } = require("child_process");
const readline = require("readline");

const version = require("./package.json").version;

(async () => {
  try {
    console.log("Current tags:");
    console.log(execSync("git tag").toString());
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`Proceed to release with tag v${version}? [Y/n]`, (answer) => {
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        console.warn(`Releasing tag v${version}`);
        console.log(execSync(`git tag v${version}`).toString());
        console.log(execSync(`git push --tag`).toString());
      } else {
        console.warn("release aborted");
      }
      rl.close();
    });
  } catch (err) {
    console.error("Release failed", err.toString());
  }
})();
