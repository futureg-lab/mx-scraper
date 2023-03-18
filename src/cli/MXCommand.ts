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
    <CLICommand>{
        name : "Show-Infos",
        arg_count : 0,
        aliases : ["--infos", "-i"],
        description : "Show infos"
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
        description : "Match the hostname character by character",
        expect_commands : ["Search-Plugin"]
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
        description : "Fetch a single item",
        expect_commands : ["Plugin-Auto-Detect | Plugin"]
    },
    <CLICommand>{
        name : "FetchMeta-List",
        arg_count : Infinity,
        aliases : ["--fetch-all", "-fa"],
        description : "Fetch metadatas for a list of item",
        expect_commands : ["Plugin-Auto-Detect | Plugin"]
    },
    <CLICommand>{
        name : "FetchMeta-List-From-File",
        arg_count : 1,
        aliases : ["--fetch-file", "-ff"],
        description : "Fetch metadatas for a list of item from a file",
        expect_commands : ["Plugin-Auto-Detect | Plugin"]
    },

    // download
    <CLICommand>{
        name : "Download",
        arg_count : 0,
        aliases : ["--download", "-d"],
        description : "Download using the book metadata",
        expect_commands : [ 
            "Plugin-Auto-Detect | Plugin | Load-Plan",
            "FetchMeta | FetchMeta-List | FetchMeta-List-From-File | Load-Plan"
        ]
    },
    <CLICommand>{
        name : "Restart-Download",
        arg_count : 0,
        aliases : ["--restart", "-r"],
        description : "Restart cached download(s)",
        expect_commands : [
            // "Plugin-Auto-Detect | Plugin",
            "Download"
        ]
    },
    <CLICommand>{
        name : "Meta-Only",
        arg_count : 0,
        aliases : ["--meta-only", "-mo"],
        description : "Fetch | Download metadata only",
        expect_commands : [
            // "Plugin-Auto-Detect | Plugin",
            "Download"
        ]
    },
    <CLICommand>{
        name : "Parallel-Download",
        arg_count : 0,
        aliases : ["--parallel", "-pa"],
        description : "Download books concurrently",
        expect_commands : [
            // "Plugin-Auto-Detect | Plugin",
            "Download"
        ]
    },

    // handling errors
    <CLICommand>{
        name : "Error-Stack",
        arg_count : 0,
        aliases : ["--error-stack", "-es"],
        description : "Show error stack"
    },

    // cache
    <CLICommand>{
        name : "Use-Cache",
        arg_count : 0,
        aliases : ["--use-cache", "-uc"],
        description : "Force enable caching",
        expect_commands : [
            "Plugin-Auto-Detect | Plugin | Load-Plan",
            "FetchMeta | FetchMeta-List | FetchMeta-List-From-File | Load-Plan"
        ]
    },
    <CLICommand>{
        name : "No-Cache",
        arg_count : 0,
        aliases : ["--no-cache", "-nc"],
        description : "Force disable caching",
        expect_commands : [
            "Plugin-Auto-Detect | Plugin | Load-Plan",
            "FetchMeta | FetchMeta-List | FetchMeta-List-From-File | Load-Plan"
        ]
    },
    <CLICommand>{
        name : "Load-Plan",
        arg_count : 1,
        aliases : ["--load-plan", "-lp"],
        description : "Load a query plan from a yaml file",
    },
    <CLICommand>{
        name : "Set-Plan-Parameters",
        arg_count : Infinity,
        aliases : ["--plan-params", "-pp"],
        description : "Set params for a query plan (Example: -pp var1=val1 var2=val2 ...)",
        expect_commands: [ 'Load-Plan' ]
    }
];