import { MXcli } from "../src/cli/mx_cli.ts";

const mxcli = new MXcli();

const tests = [
  "mx-scraper --plugin nhentai --fetch-all 177013 410410 1234 159013",
  "mx-scraper --plugin nhentai --fetch 177013",
  "mx-scraper --plugin manganelo --fetch manga-yg951863",
  "mx-scraper --auto --fetch http://some/link/to/a/title",
];

for (const test of tests) {
  console.log();
  const [, ...argv] = test.split(" ");
  console.log(mxcli.parse(argv));
}
