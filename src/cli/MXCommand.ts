import { CLICommand } from "./CLIEngine";

export const COMMAND_DEF = <CLICommand[]> [
    // other
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
        description : "Show more details"
    },

    // search plugin
    <CLICommand>{
        name : "Search-Plugin",
        arg_count : 1,
        aliases : ["--search-plugin", "-se-p"],
        description : "Search plugins for a given url"
    },
    <CLICommand>{
        name : "Exact-Match",
        arg_count : 0,
        aliases : ["--exact-match", "-exact"],
        description : "Match the hostname character by character"
    },

    // session
    <CLICommand>{
        name : "Use-Session",
        arg_count : 1,
        aliases : ["--use-session", "-s"],
        description : "Use a particular sessionid"
    },
    <CLICommand>{
        name : "Conf-Session",
        arg_count : 0,
        aliases : ["--conf-session", "-cs"],
        description : "Use the UNIQUE_SESSION value in the configuration file"
    },

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
    <CLICommand>{
        name : "FetchMeta-List-From-File",
        arg_count : 1,
        aliases : ["--fetch-file", "-ff"],
        description : "Fetch metadatas for a list of item from a file"
    },
    <CLICommand>{
        name : "Meta-Only",
        arg_count : 0,
        aliases : ["--meta-only", "-mo"],
        description : "Fetch | Download metadata only"
    },

    // download
    <CLICommand>{
        name : "Download",
        arg_count : 0,
        aliases : ["--download", "-d"],
        description : "Download using the book metadata"
    },
    <CLICommand>{
        name : "Restart-Download",
        arg_count : 0,
        aliases : ["--restart", "-r"],
        description : "Restart cached download(s)"
    },
    <CLICommand>{
        name : "Parallel-Download",
        arg_count : 0,
        aliases : ["--parallel", "-pa"],
        description : "Download books concurrently"
    }
];