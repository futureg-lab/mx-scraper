import { parse } from "yaml"
import { readFileSync } from "node:fs"

export class QueryPlanner {

    private constructor(source_code: string) {
        const result = parse(source_code);
        console.log(result);
    }

    static from (filepath: string) {
        const content = readFileSync(filepath).toString();
        return new QueryPlanner(content);
    }
}