import { parse } from "yaml"
import { readFileSync } from "node:fs"
import { Book } from "./BookDef";

interface OnTarget {
    url: string;
    index: number;
    total: number;
    error?: Error;
}

export type Filter = {
    select: string;
    where: string;
    followLink?: Filter;
};

export type Counter = {
    range: [number, number];
    onError: string;
    each?: Counter;
};

export type Iterate = {
    [iterName: string]: Counter
};


export type Plan = {
    version: string;
    target: string | string[];
    title?: string;
    filter: Filter;
    iterate?: Iterate;
};

export class QueryPlan {
    plan: Plan;
    params: Record<string, string>;
    private constructor(source_code: string) {
        const raw_plan = parse(source_code);
        this.plan = this.validate(raw_plan);
        console.log(this.plan);
    }

    static load (filepath: string) {
        const content = readFileSync(filepath).toString();
        return new QueryPlan(content);
    }

    with (params: Record<string, string>) {
        this.params = params;
        return this;
    }

    run (callback?: OnTarget): Book {
        return null;
    }

    private validate (raw_plan: unknown): Plan {
        const res: any = {};
        const get = (root: any, key: string, required: boolean = false, process?: any) => {
            const value = root[key];
            if (value === undefined && required)
                throw Error(`Property ${key} not found in the query plan`);
            res[key] = process ? process(value) : value;
        };
        
        get(raw_plan, 'version', true);
        get(raw_plan, 'target', true);
        get(raw_plan, 'title', false);

        const filterProcessor = (filter: any, path: string[] = ['filter']) => {
            const curr_path = path.join('.');
            if (!filter.select) 
                throw Error (`html object not selected at ${curr_path}`);
            if (!filter.where) 
                throw Error (`where query is undefined at ${curr_path}`);
            if (filter.followLink)
                filterProcessor(filter.followLink, [...path, 'followLink']);
            return filter;
        };
        get(raw_plan, 'filter', true, filterProcessor);

        const iterateProcessor = (iterate: any, path: string[] = ['iterate']) => {
            const iterName = Object.keys(iterate)[0];
            path.push(iterName);
            const curr_path = path.join('.');
            if (!iterName) 
                throw Error(`counter name for iterate undefined at ${curr_path}`);
            const counter = iterate[iterName];
            if (counter.onError) {
                const valid = ['continue', 'break'];
                if (!valid.includes(counter.onError)) {
                    const expected = valid.map((v: string) => `"${v}"`).join(' or ');
                    throw Error(`onError has invalid value "${counter.onError}" at ${curr_path}, ${expected} expected`);
                }
            }
            if (!counter.range) 
                throw Error(`counter.range is undefined at ${curr_path}`);
            if (counter.each) 
                iterateProcessor(counter.each,  [...path, 'each']);
            return iterate;
        };
        get(raw_plan, 'iterate', false, iterateProcessor);

        return res as Plan;
    }
}