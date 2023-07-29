import { MXLogger } from "../cli/MXLogger";

console.log("Top text");
let count = 0;
setInterval(() => {
  MXLogger.infoRefresh("Count " + count++);
}, 1000);
