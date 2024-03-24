import { CLICommand } from "./cli_engine.ts";

export const COMMAND_DEF = <CLICommand[]> [
  // other
  <CLICommand> {
    name: "Show-Plugins",
    argCount: 0,
    aliases: ["--show-plugins", "-sp"],
    description: "Show plugin list",
  },
  <CLICommand> {
    name: "Show-Help",
    argCount: 0,
    aliases: ["--help", "-h"],
    description: "Show plugin list",
  },
  <CLICommand> {
    name: "Verbose",
    argCount: 0,
    aliases: ["--verbose", "-v"],
    description: "Show more details",
  },
  <CLICommand> {
    name: "Show-Infos",
    argCount: 0,
    aliases: ["--infos", "-i"],
    description: "Show infos",
  },

  // search plugin
  <CLICommand> {
    name: "Search-Plugin",
    argCount: 1,
    aliases: ["--search-plugin", "-se-p"],
    description: "Search plugins for a given url",
  },
  <CLICommand> {
    name: "Exact-Match",
    argCount: 0,
    aliases: ["--exact-match", "-exact"],
    description: "Match the hostname character by character",
    expectCommands: ["Search-Plugin"],
  },

  // plugin spec
  <CLICommand> {
    name: "Plugin",
    argCount: 1,
    aliases: ["--plugin", "-p"],
    description: "Specify a plugin",
  },
  <CLICommand> {
    name: "Plugin-Auto-Detect",
    argCount: 0,
    aliases: ["--auto", "-a"],
    description: "Auto detect a plugin",
  },

  // fetch
  <CLICommand> {
    name: "FetchMeta",
    argCount: 1,
    aliases: ["--fetch", "-f"],
    description: "Fetch a single item",
    expectCommands: ["Plugin-Auto-Detect | Plugin"],
  },
  <CLICommand> {
    name: "FetchMeta-List",
    argCount: Infinity,
    aliases: ["--fetch-all", "-fa"],
    description: "Fetch metadatas for a list of item",
    expectCommands: ["Plugin-Auto-Detect | Plugin"],
  },
  <CLICommand> {
    name: "FetchMeta-List-From-File",
    argCount: 1,
    aliases: ["--fetch-file", "-ff"],
    description: "Fetch metadatas for a list of item from a file",
    expectCommands: ["Plugin-Auto-Detect | Plugin"],
  },

  // download
  <CLICommand> {
    name: "Download",
    argCount: 0,
    aliases: ["--download", "-d"],
    description: "Download using the book metadata",
    expectCommands: [
      "Plugin-Auto-Detect | Plugin | Load-Plan",
      "FetchMeta | FetchMeta-List | FetchMeta-List-From-File | Load-Plan",
    ],
  },
  <CLICommand> {
    name: "Restart-Download",
    argCount: 0,
    aliases: ["--restart", "-r"],
    description: "Restart cached download(s)",
    expectCommands: [
      // "Plugin-Auto-Detect | Plugin",
      "Download",
    ],
  },
  <CLICommand> {
    name: "Meta-Only",
    argCount: 0,
    aliases: ["--meta-only", "-mo"],
    description: "Fetch | Download metadata only",
    expectCommands: [
      // "Plugin-Auto-Detect | Plugin",
      "Download",
    ],
  },
  <CLICommand> {
    name: "Parallel-Download",
    argCount: 0,
    aliases: ["--parallel", "-pa"],
    description: "Download books concurrently",
    expectCommands: [
      // "Plugin-Auto-Detect | Plugin",
      "Download",
    ],
  },

  // handling errors
  <CLICommand> {
    name: "Error-Stack",
    argCount: 0,
    aliases: ["--error-stack", "-es"],
    description: "Show error stack",
  },

  // cache
  <CLICommand> {
    name: "Use-Cache",
    argCount: 0,
    aliases: ["--use-cache", "-uc"],
    description: "Force enable caching",
    expectCommands: [
      "Plugin-Auto-Detect | Plugin | Load-Plan",
      "FetchMeta | FetchMeta-List | FetchMeta-List-From-File | Load-Plan",
    ],
  },
  <CLICommand> {
    name: "No-Cache",
    argCount: 0,
    aliases: ["--no-cache", "-nc"],
    description: "Force disable caching",
    expectCommands: [
      "Plugin-Auto-Detect | Plugin | Load-Plan",
      "FetchMeta | FetchMeta-List | FetchMeta-List-From-File | Load-Plan",
    ],
  },
  <CLICommand> {
    name: "Load-Plan",
    argCount: 1,
    aliases: ["--load-plan", "-lp"],
    description: "Load a query plan from a yaml file",
  },
  <CLICommand> {
    name: "Set-Plan-Parameters",
    argCount: Infinity,
    aliases: ["--plan-params", "-pp"],
    description:
      "Set params for a query plan (Example: -pp var1=val1 var2=val2 ...)",
    expectCommands: ["Load-Plan"],
  },
  <CLICommand> {
    name: "Cookie",
    argCount: 1,
    aliases: ["--cookie", "-co"],
    description:
      `Set client Cookie header value in the format "c1=c1; c2=v2; .."`,
  },
  <CLICommand> {
    name: "Parser-Graphql-Server",
    argCount: 0,
    aliases: ["--dev-parser", "-dev-p"],
    description: "Run a graphql server that exposes the HtmlParser API",
  },
];
