import { levenshtein } from "../utils/Utils";

/**
 * Abstraction of a command unit
 */
export interface CLICommand {
  name: string;
  aliases: string[];
  arg_count: number;
  description?: string;
  expect_commands?: string[];
}

/**
 * Custom engine for the command line
 */
export class CLIEngine {
  commands: Map<string, CLICommand>;
  aliases: Map<string, string>;
  required: Set<string[]>;

  /**
   * @param command_list list of all possible commands
   */
  constructor(command_list: CLICommand[]) {
    this.commands = new Map<string, CLICommand>();
    this.aliases = new Map<string, string>();
    for (let command of command_list) {
      this.commands.set(command.name, command);
      if (command.arg_count < 0) {
        throw Error(`arg_count for "${command.name}" is negative`);
      }
      for (let alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }
  }

  /**
   * @param required_name_list list of expected arguments
   */
  defineRequiredArgs(required_name_list: string[]) {
    this.required = new Set();
    // required_name_list[i] := full_str := spec1 | spec2 | ... | specN
    for (let full_str of required_name_list) {
      const splits = full_str
        .split("|")
        .map((v, _) => v.trim());
      for (let name of splits) {
        this.commandNameExistOrThrowError(name);
      }
      this.required.add(splits);
    }
  }

  private commandNameExistOrThrowError(name: string) {
    if (this.commands.get(name) === undefined) {
      throw Error(
        `Command with name "${name}" does not exist in the command list`,
      );
    }
  }

  private commandAliasExistOrThrowSuggest(alias: string) {
    if (this.aliases.get(alias) === undefined) {
      const ressembl_sugg = 2;
      const max_dist = 3;
      const possibilities = Array
        .from(this.aliases.keys())
        .map((key: string, _) =>
          <any> {
            key: key,
            dist: levenshtein(key, alias),
          }
        )
        .sort((a, b) => a.dist - b.dist)
        .filter((v, _) => v.dist <= max_dist)
        .slice(0, ressembl_sugg)
        .map((v, _) => v.key);
      const suggestion = possibilities.length == 0
        ? ""
        : ` , did you mean ${possibilities.join(", ")}`;
      throw Error(`Command "${alias}" does not exist${suggestion} ?`);
    }
  }

  private commandSolveInterExpectation(parsed: Map<string, string[]>): void {
    const parsed_keys = Array.from(parsed.keys());
    for (let key of parsed_keys) {
      const command = this.commands.get(key);
      if (command.expect_commands) {
        for (let name_or of command.expect_commands) {
          const names = name_or.split("|").map((name) => name.trim());
          let count = 0;
          for (let name of names) {
            count += parsed.has(name) ? 1 : 0;
          }

          if (count == 0) {
            throw Error(
              "Parsing failed :" +
                '"' + command.name + '" expects ' +
                names.map((name) => {
                  return this.commands.get(name).aliases.join(" | ");
                })
                  .join(" or "),
            );
          }
        }
      }
    }
  }

  parse(args: string[]): Map<string, string[]> {
    const state = new Map<string, string[]>();
    let cursor = 0;
    while (cursor < args.length) {
      this.commandAliasExistOrThrowSuggest(args[cursor]);
      const current = this.aliases.get(args[cursor]);
      cursor++;

      // all ok
      const command = this.commands.get(current);
      let values: string[] = [];
      if (command.arg_count == Infinity || command.arg_count == undefined) {
        while (cursor < args.length) {
          const value = args[cursor];
          if (this.aliases.get(value) !== undefined) {
            break; // got a legit command
          } else {
            values.push(value);
            cursor++;
          }
        }
      } else {
        // finite
        let offset = cursor;
        while (cursor < Math.min(offset + command.arg_count, args.length)) {
          values.push(args[cursor]);
          cursor++;
        }

        if (values.length != command.arg_count) {
          throw Error(
            `At "${args[offset - 1]}" : Expected ${command.arg_count} value${
              command.arg_count > 1 ? "s" : ""
            }, got ${values.length} instead`,
          );
        }
      }

      if (state.get(command.name) !== undefined) {
        throw Error(`At "${args[cursor]}", command already specified`);
      }

      state.set(command.name, values);
    }

    const extracted = Array.from(state.keys());
    const missing = [];
    this.required.forEach((specs: string[]) => {
      let has_requirement = false;
      for (let spec of specs) {
        if (extracted.includes(spec)) {
          has_requirement = true;
          break;
        }
      }

      if (!has_requirement) {
        missing.push(specs.map((v) => `"${v}"`).join(" | "));
      }
    });

    if (missing.length > 0) {
      throw Error(`Missing command relative to ${missing.join(", ")}`);
    }

    // inter-expectation
    this.commandSolveInterExpectation(state);

    return state;
  }
}
