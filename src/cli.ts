import { MXcli } from "./cli/MXcli";

const [ , , ...argv] = process.argv;
const mxcli = new MXcli();

// example :
// npx ts-node ./src/index.ts %*
try {
    mxcli.runCommand (argv);
} catch (err) {
    console.error (err);
}