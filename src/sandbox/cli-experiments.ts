import { CLICommand, CLIEngine } from "../cli/CLIEngine";

const commands = <CLICommand[]> [
  <CLICommand> {
    name: "download",
    arg_count: Infinity,
    aliases: ["--download", "-d"],
    description: "Download a list of files",
  },
  <CLICommand> {
    name: "Some Profile",
    arg_count: 0,
    aliases: ["--profile", "-p"],
    description: "lorem ipsum",
  },
  <CLICommand> {
    name: "Another profile with args",
    arg_count: 2,
    aliases: ["--another", "-a", "-anoth"],
  },
];
const cliEngine = new CLIEngine(commands);

// has at least a download or Some Profile + Another profile with args
cliEngine.defineRequiredArgs([
  "download | Some Profile",
  "Another profile with args",
]);

console.log(cliEngine.aliases);

const samples = [
  "--download file1.txt file2.docx file3.txt",
  "-d file1.txt file2.docx file3.txt file4.txt",
  "--another x y -d file1.txt file2.docx file3.txt",
  "-d file1.txt file2.docx file3.txt --another x y",
  "-p -a x y --download 01 02 03",
  // "-a x y"
];

for (let sample of samples) {
  console.log();
  try {
    const map = cliEngine.parse(sample.split(" "));
    console.log(map);
  } catch (err) {
    console.error(err);
  }
}
// cliEngine.defineRequiredArgs();
