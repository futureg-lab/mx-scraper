import { CLICommand, CLIEngine } from "../cli/CLIEngine";

const commands = <CLICommand[]> [
    <CLICommand>{
        name : "download",
        arg_count : Infinity,
        aliases : ["--download", "-d"],
        description : "Download a list of files"
    },
    <CLICommand>{
        name : "Some Profile",
        arg_count : 0,
        aliases : ["--profile", "-p"],
        description : "lorem ipsum"
    },
    <CLICommand>{
        name : "Another profile with args",
        arg_count : 2,
        aliases : ["--another", "-a", "-anoth"]
    }
];
const cliEngine = new CLIEngine(commands);

cliEngine.defineRequiredArgs (["download"]);

console.log(cliEngine.aliases);

const samples = [
    "--download file1.txt file2.docx file3.txt",
    "-d file1.txt file2.docx file3.txt",
    "--another x y -d file1.txt file2.docx file3.txt -p"
];

for (let sample of samples) {
    const map = cliEngine.parse(sample.split(" "));
    // console.log(map);
}
// cliEngine.defineRequiredArgs();