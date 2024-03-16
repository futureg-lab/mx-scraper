import { levenshtein } from "../utils/utils.ts";

/**
 * Abstraction of a command unit
 */
export interface CLICommand {
  name: string;
  aliases: string[];
  argCount: number;
  description?: string;
  expectCommands?: string[];
}

/**
 * Custom engine for the command line
 */
export class CLIEngine {
  commands: Map<string, CLICommand>;
  aliases: Map<string, string>;
  required: Set<string[]> = new Set<string[]>();

  /**
   * @param commandList list of all possible commands
   */
  constructor(commandList: CLICommand[]) {
    this.commands = new Map<string, CLICommand>();
    this.aliases = new Map<string, string>();
    for (const command of commandList) {
      this.commands.set(command.name, command);
      if (command.argCount < 0) {
        throw Error(`argCount for "${command.name}" is negative`);
      }
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }
  }

  /**
   * @param requiredNameList list of expected arguments
   */
  defineRequiredArgs(requiredNameList: string[]) {
    this.required = new Set();
    // requiredNameList[i] := fullStr := spec1 | spec2 | ... | specN
    for (const fullStr of requiredNameList) {
      const splits = fullStr
        .split("|")
        .map((v, _) => v.trim());
      for (const name of splits) {
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
      const ressemblSugg = 2;
      const maxDist = 3;
      const possibilities = Array
        .from(this.aliases.keys())
        .map((key: string, _) =>
          <any> {
            key: key,
            dist: levenshtein(key, alias),
          }
        )
        .sort((a, b) => a.dist - b.dist)
        .filter((v, _) => v.dist <= maxDist)
        .slice(0, ressemblSugg)
        .map((v, _) => v.key);
      const suggestion = possibilities.length == 0
        ? ""
        : `, did you mean ${possibilities.join(", ")}`;
      throw Error(`Command "${alias}" does not exist${suggestion} ?`);
    }
  }

  private commandSolveInterExpectation(parsed: Map<string, string[]>): void {
    const parsedKeys = Array.from(parsed.keys());
    for (const key of parsedKeys) {
      const command = this.commands.get(key)!;
      if (command.expectCommands) {
        for (const nameOr of command.expectCommands) {
          const names = nameOr.split("|").map((name) => name.trim());
          let count = 0;
          for (const name of names) {
            count += parsed.has(name) ? 1 : 0;
          }

          if (count == 0) {
            const choices = names.map((name) => {
              return this.commands.get(name)!.aliases.join(" | ");
            }).reduce((acc, v, i) => {
              const sep = (i == 0 || names.length == i + 1) ? ", " : "";
              return acc + sep + v;
            }, "");

            throw Error(
              `Parsing failed: "${command.name}" expects ${choices}`,
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
      const current = this.aliases.get(args[cursor])!;
      cursor++;

      // all ok
      const command = this.commands.get(current)!;
      const values: string[] = [];
      if (command.argCount == Infinity || command.argCount == undefined) {
        while (cursor < args.length) {
          const value = args[cursor];
          if (this.aliases.has(value)) {
            break; // got a legit command
          } else {
            values.push(value);
            cursor++;
          }
        }
      } else {
        // finite
        const offset = cursor;
        while (cursor < Math.min(offset + command.argCount, args.length)) {
          values.push(args[cursor]);
          cursor++;
        }

        if (values.length != command.argCount) {
          throw Error(
            `At "${
              args[offset - 1]
            }": Expected ${command.argCount} value(s), got ${values.length} instead`,
          );
        }
      }

      if (state.has(command.name)) {
        throw Error(`At "${args[cursor - 1]}", command already specified`);
      }

      state.set(command.name, values);
    }

    const extracted = Array.from(state.keys());
    const missing = [] as Array<string>;
    this.required.forEach((specs: string[]) => {
      let hasRequirement = false;
      for (const spec of specs) {
        if (extracted.includes(spec)) {
          hasRequirement = true;
          break;
        }
      }

      if (!hasRequirement) {
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
