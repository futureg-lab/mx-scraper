import { levenshtein } from "../utils/Utils";

/**
 * Abstraction of a command unit
 */
export interface CLICommand {
    name : string;
    aliases : string [];
    arg_count : number;
    description? : string;
}

export class CLIEngine {
    commands : Map<string, CLICommand>;
    aliases : Map<string, string>;
    required : string[];
    
    /**
     * @param command_list list of all possible commands
     */
    constructor (command_list : CLICommand []) {
        this.commands = new Map<string, CLICommand>();
        this.aliases = new Map<string, string>();
        for (let command of command_list) {
            this.commands.set(command.name, command);
            if (command.arg_count < 0)
                throw Error (`arg_count for "${command.name}" is negative`);
            for (let alias of command.aliases)
                this.aliases.set(alias, command.name);
        }
    }

    /**
     * @param required_name_list list of expected arguments
     */
    defineRequiredArgs (required_name_list : string []) {
        for (let name of required_name_list)
            this.commandNameExistOrThrowError (name);
        this.required = required_name_list;
    }

    private commandNameExistOrThrowError (name : string) {
        if (this.commands.get(name) === undefined)
            throw Error (`Command with name "${name}" does not exist in the command list`);
    }

    private commandAliasExistOrThrowSuggest (alias : string) {
        if (this.aliases.get(alias) === undefined) {
            const ressembl_sugg = 2;
            const possibilities = Array
                                .from(this.aliases.keys())
                                .map ((key : string, _) => <any>{
                                    key : key, 
                                    dist : levenshtein(key, alias)
                                })
                                .sort((a, b) => a.dist - b.dist)
                                .slice(0, ressembl_sugg)
                                .map((v, _) => v.key);
            throw Error (`Command "${alias}" does not exist, did you mean ${possibilities.join(', ')} ?`);
        }
    }

    parse (args : string[]) : Map<string, string[]> {
        const state = new Map<string, string[]> ();
        let cursor = 0;
        while (cursor < args.length) {
            this.commandAliasExistOrThrowSuggest (args[cursor]);
            const current = this.aliases.get(args[cursor]);
            // all ok
            const command = this.commands.get (current);
            let values : string[] = [];
            if (command.arg_count == Infinity) {
                while (cursor < args.length) {
                    const value = args[cursor + 1];
                    if (this.aliases.get(value) != undefined) {
                        break; // got a legit command
                    } else {
                        values.push (value);
                        cursor++;
                    }
                }
            } else {
                // finite
                console.log("there!!!!!!!!!", args[cursor]);
                while (cursor < Math.min(command.arg_count + cursor - 1, args.length))
                    values.push (args[++cursor]);
                
                if (values.length != command.arg_count)
                    throw Error (`Error at "${args[cursor]}" : Expected ${command.arg_count} values, got ${values.length} instead`);
                
            }

            state[command.name] = values;
        }
        return state;
    }
}