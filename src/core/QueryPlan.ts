import { parse } from "yaml"
import { readFileSync } from "node:fs"
import { Book, Chapter, Page, Tag } from "./BookDef";
import { extractFilenameFromUrl, feedValues, resumeText } from "../utils/Utils";
import { CustomRequest, FlareSolverrProxyOption } from "../utils/CustomRequest";
import { HtmlParser } from "../utils/HtmlParser";
import { MXLogger } from "../cli/MXLogger";
import { hashResume } from "../utils/Downloader";
import { MXPlugin } from "./MXPlugin";
import { config } from "../environment";

export type OnTarget = {
    (
        url: string,
        error?: Error
    ): void
};

export type OnErrorThrown = {
    (
        url: string,
        error?: Error
    ): void
};

export type OnErrorFlag = 'continue' | 'break';

export type Filter = {
    select: string;
    where?: string;
    linkFrom: string;
    followLink?: Filter;
};

export type Counter = {
    range: [number, number];
    onError: OnErrorFlag;
    each?: Iterate;
};

export type Iterate = {
    [iterName: string]: Counter
};

export type Plan = {
    version: string;
    title?: string;
    target: string | string[];
    filter: Filter;
    headless?: boolean;
    flaresolverr?: boolean;
    verbose?: boolean;
    canonicalName?: boolean;
    required?: string[],
    default?: Record<string, string>;
    iterate?: Iterate;
};

export class QueryPlan {
    plan: Plan;
    params: Record<string, string | string>;
    usedNames: Set<string>;
    request : CustomRequest;
    verbose: boolean = true;

    private constructor(source_code: string) {
        // init props
        this.params = {};
        this.usedNames = new Set<string>();
        this.request = new CustomRequest();        
        // load, validate and sanitize the plan
        const raw_plan = parse(source_code);
        this.plan = this.validate(raw_plan);
    }

    static fromString (source: string) {
        return new QueryPlan(source);
    }

    static load (filepath: string) {
        const content = readFileSync(filepath).toString();
        return this.fromString(content);
    }

    with (params: Record<string, string>) {
        this.params = params;
        // yaml variables has higher priority over cli args
        for (const key in params) {
            if (this.usedNames.has(key))
                throw Error(`parameters error, variable "${key}" already used in the plan`);
            this.usedNames.add(key);
        }
        // prepare the title
        this.plan.title = feedValues(this.plan.title ?? 'untitled_{_TIMESTAMP_}', this.params);
        return this;
    }

    async get(useCache: boolean, callback?: OnTarget): Promise<Book> {
        const plugin = new MXPlugin();
        plugin.title = "QueryPlan";
        plugin.version = "1.0.0";
        
        if (useCache) {
            const cacheHit = plugin.fetchBookFromCache(this.plan.title);
            if (cacheHit) 
                return cacheHit;
        }

        const book = await this.run(callback);
        plugin.writeBookTocache(book.title, book);
        return book;
    }

    async run (callback?: OnTarget): Promise<Book> {
        const {
            version, 
            target, 
            title, 
            filter, 
            iterate,
            required,
            headless,
            flaresolverr,
            verbose,
            canonicalName,
            default: defaultArgs
        } = this.plan;
        if (version != '1.0.0') 
            throw Error(`version ${version} not supported`);
        
        if (verbose) {
            MXLogger.info('[QueryPlan] verbose enabled');
            this.verbose = true;
        }

        // first, populate the default value if not present
        if (defaultArgs) {
            for (const [key, value] of Object.entries(defaultArgs)) {
                if (key in this.params) continue;
                // allow user to do _RANDOM_ and _TIMESTAMP_
                this.params[key] = feedValues(value, this.params);
            }
        }

        if (headless) {
            this.verbose && MXLogger.info('[QueryPlan] Headless mode enabled');
            this.request.enableRendering();
        }

        if (canonicalName) {
            this.verbose && MXLogger.info('[QueryPlan] use default name enabled');
        }

        if (flaresolverr) {
            this.verbose && MXLogger.info('[QueryPlan] Flaresolverr enabled');
            const solver_option = <FlareSolverrProxyOption>{
                proxy_url: config.CLOUDFARE_PROXY_HOST,
                timeout: config.CLOUDFARE_MAX_TIMEOUT
            };
            this.request.configureProxy (solver_option);
        }

        if (required) {
            for (const requirement of required) {
                if (typeof requirement != 'string')
                    throw Error(`required variable name "${requirement}" is not a string`);
                const available = Object.keys(this.params);
                if (!available.includes(requirement)) {
                    throw Error(
                        `unable to resolve required variable "${requirement}", available names: ${
                            available.length == 0 ? "<none>" :
                                available
                                    .map((v: string) => `"${v}"`)
                                    .join(', ')
                        }`
                    );
                }
            }
        }

        const allTargets = (Array.isArray(target) ? target : [target]).map(
            link => feedValues(link, this.params)
        );

        let depth = 0;
        const indent = (str: string) => new Array(depth).fill('=').join('') + str; 
        const navigateUrl = async (
            root: Filter, 
            pages: Page[], 
            url: string, 
            baseUrl: string,
            onErrorCallback: OnErrorThrown
            ) => {
            if (url.startsWith('/'))
                url = new URL(url, baseUrl).href;
            this.verbose && MXLogger.infoRefresh(indent('> Focus on ' + url));
            
            depth++;
            const html = await this.request.get(url);
            const { select, where, linkFrom } = root;
            const nodes = HtmlParser.use(html).select(select);
            const selection = (where ? nodes.where(where) : nodes).all();
            for (const item of selection) {
                let link = item.asText().trim();
                if (linkFrom.startsWith('attr.')) {
                    const [ _, attribute] = linkFrom.split('.');
                    link = item.attr(attribute)?.trim();
                }
                try {
                    if (!link || link == '')
                        throw Error(`Unable to fetch link from "${select}", got "${link}"`);

                    if (root.followLink) {
                        await navigateUrl(root.followLink, pages, link, baseUrl, onErrorCallback);
                    } else {
                        const pageCount = pages.length + 1;
                        callback && callback(link);
                        this.verbose && MXLogger.info(indent('> Detected'), resumeText(link), '#' + pageCount);
                        // name can have parameters
                        const rawExt = link.split('.').pop();
                        const ext = rawExt?.match(/[a-z]+/i)?.[0] ?? 'jpg';
                        const generatedName = pageCount + '.' + ext;
                        const canonName = extractFilenameFromUrl(link);
                        pages.push({
                            filename: canonicalName ? canonName : generatedName,
                            number: pageCount,
                            title: item.attr('alt') ?? pageCount.toString(),
                            url: link
                        });
                    }
                } catch(err) {
                    this.verbose && MXLogger.info(err.message);
                    callback && callback(link, err);
                    onErrorCallback(link, err);
                }
            }
            depth--;
        };

        const processUrl = async (url: string, onErrorCallback: OnErrorThrown): Promise<Page[]> => {
            const urlProcessed = feedValues(url, this.params);
            const baseUrl = new URL(urlProcessed).origin;
            const pages = new Array<Page>();
            await navigateUrl(filter, pages, urlProcessed, baseUrl, onErrorCallback);
            return pages;
        };

        const chapters = new Array<Chapter>();
        
        if (iterate) {
            const processIterate = async (root: Iterate, target: string, chapter: Chapter) => {
                const [counterName] = Object.keys(root);
                const counter = root[counterName];
                const [start, end] = counter.range;
                for (let i = start; i <= end; i++) {
                    this.params[counterName] = i.toString();
                    if (counter.each) {
                        await processIterate(counter.each, target, chapter);
                    } else {
                        try {
                            const fetchErrors = new Array<[string, Error]>();
                            const onErrorCallback = (url: string, error: Error) => {
                                fetchErrors.push([url, error]);
                            };
                            const newPages = await processUrl(target, onErrorCallback);
                            if (newPages.length == 0)
                                throw Error(`no content found at ${target}`);

                            chapter.pages.push(...newPages);
                            if (fetchErrors.length > 0) {
                                throw Error(`Fetch error(s) has occured: [${
                                    fetchErrors.map(err => {
                                        return err.join(': ')
                                    }).join(',')
                                }]`);
                            }
                        } catch (err) {
                            if(counter.onError == 'break') {
                                break;
                            } else /* ignore */;
                        }
                    }
                }
            }
            // apply individual iteration for each target
            for (const url of allTargets) {
                const chapterCount = chapters.length + 1;
                const chapter = <Chapter>{
                    title: `CH.${chapterCount}`,
                    description: '',
                    number: chapterCount,
                    pages: [],
                    url: url
                };
                await processIterate(iterate, url, chapter);
                chapters.push(chapter);
            }
        } else {
            for (const url of allTargets) {
                const chapterCount = chapters.length + 1;
                const chapter = <Chapter>{
                    title: `CH.${chapterCount}}`,
                    description: '',
                    number: chapterCount,
                    pages: [],
                    url: url
                };
                const onErrorCallback = (url: string, _: Error) => {
                    this.verbose && MXLogger.info('Fetch error '+ url); 
                };
                chapter.pages = await processUrl(url, onErrorCallback);
                chapters.push(chapter);
            }
        }

        MXLogger.info('\n');
        return <Book> {
            title: title,
            authors: [],
            chapters: chapters,
            metadatas: [],
            description: allTargets.join(', '),
            source_id: title,
            tags: allTargets.map(target => <Tag>{
                name: new URL(target).hostname.replace('www.', ''),
                metadatas: []
            }),
            url: allTargets[0] ?? '', // any idea ?
            title_aliases: [],
        };
    }

    private validate (raw_plan: unknown): Plan {
        const res: any = {};
        const get = (root: any, key: string, required: boolean = false, process?: any) => {
            const value = root[key];
            if (value === undefined && required)
                throw Error(`required command "${key}" not found in the query plan`);
            if (process) 
                res[key] = value ? process(value) : value;
            else
                res[key] = value;
        };
        
        get(raw_plan, 'version', true);
        get(raw_plan, 'target', true);
        get(raw_plan, 'title', false);

        const processBoolean = (value: any) => {
            if (typeof value != 'boolean')
                throw Error(`"${value}" is not a boolean`);
            return value;
        };

        get(raw_plan, 'headless', false, processBoolean);
        get(raw_plan, 'flaresolverr', false, processBoolean);
        get(raw_plan, 'verbose', false, processBoolean);
        get(raw_plan, 'canonicalName', false, processBoolean);

        get(raw_plan, 'required', false, (required: any) => {
            if (required && !Array.isArray(required))
                throw Error(`"${required}" is not an array at required`);
            return required;
        });
        get(raw_plan, 'default', false, (defaultArgs: any) => {
            if (defaultArgs && typeof defaultArgs != "object")
                throw Error("default is not an key value object");
            return defaultArgs;
        });

        const filterProcessor = (filter: any, path: string[] = ['filter']) => {
            const curr_path = path.join('.');
            if (!filter.select) 
                throw Error (`html object not selected at ${curr_path}`);
            if (!filter.linkFrom)
                throw Error (`linkFrom is undefined at ${curr_path}`);
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
            
            if (this.usedNames.has(iterName))
                throw Error(`variable "${iterName}" already used at ${curr_path}`);
            this.usedNames.add(iterName);

            const counter = iterate[iterName];
            if (counter.onError) {
                const valid = ['continue', 'break'];
                if (!valid.includes(counter.onError)) {
                    const expected = valid.map((v: string) => `"${v}"`).join(' or ');
                    throw Error(`onError has invalid value "${counter.onError}" at ${curr_path}, ${expected} expected`);
                }
            }
            if (counter.range) {
                if (Array.isArray(counter.range)) {
                    if (counter.range.length > 2) 
                        throw Error(`invalid range size at ${curr_path}.range`);
                    const [start, end] = counter.range.map((x: any) => parseInt(x));
                    if (isNaN(start)) throw Error(`${start} is not a number at ${curr_path}.range[0]`);
                    if (isNaN(end)) throw Error(`${end} is not a number at ${curr_path}.range[1]`);
                    if (start > end) throw Error(`${start} > ${end} at ${curr_path}.range`);
                } else 
                    throw Error(`range is not an array at ${curr_path}`);
            } else
                throw Error(`range is undefined at ${curr_path}`);
            if (counter.each) 
                iterateProcessor(counter.each,  [...path, 'each']);
            return iterate;
        };
        get(raw_plan, 'iterate', false, iterateProcessor);

        return res as Plan;
    }
}