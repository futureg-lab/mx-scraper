import { CLICommand } from "./CLIEngine";

export const COMMAND_DEF = <CLICommand[]> [
    // plugin spec
    <CLICommand>{
        name : "Plugin",
        arg_count : 1,
        aliases : ["--plugin", "-p"],
        description : "Specify a plugin"
    },
    <CLICommand>{
        name : "Plugin-Auto-Detect",
        arg_count : 0,
        aliases : ["--auto", "-a"],
        description : "Auto detect a plugin"
    },
    <CLICommand>{
        name : "Show-Plugins",
        arg_count : 0,
        aliases : ["--show-plugins", "-sp"],
        description : "Show plugin list"
    },
    <CLICommand>{
        name : "Show-Help",
        arg_count : 0,
        aliases : ["--help", "-h"],
        description : "Show plugin list"
    },
    <CLICommand>{
        name : "Verbose",
        arg_count : 0,
        aliases : ["--verbose", "-v"],
        description : ""
    },
    // fetch
    <CLICommand>{
        name : "FetchMeta",
        arg_count : 1,
        aliases : ["--fetch", "-f"],
        description : "Fetch a single item"
    },
    <CLICommand>{
        name : "FetchMeta-List",
        arg_count : Infinity,
        aliases : ["--fetch-all", "-fa"],
        description : "Fetch metadatas for a list of item"
    },
    // download
    <CLICommand>{
        name : "Download",
        arg_count : 0,
        aliases : ["--download", "-d"],
        description : "Download using the book metadata"
    },
    <CLICommand>{
        name : "Chapter",
        arg_count : 0,
        aliases : ["--chapter", "-ch"],
        description : "Specify a chapter for a download"
    }
];