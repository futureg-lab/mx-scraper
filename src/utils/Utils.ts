import { Book } from "../core/BookDef";
import * as fs from "fs";
import { MXLogger } from "../cli/MXLogger";

/**
 * @param a
 * @param b
 * @returns Edit distance of two strings
 */
export function levenshtein(a: string, b: string): number {
  let u = a.length,
    v = b.length;
  let arr = [];

  for (let k = -1; k < u; k++) {
    arr[k] = [];
    arr[k][-1] = k + 1;
  }

  for (let j = -1; j < v; j++, arr[-1][j] = j + 1);

  for (let k = 0; k < u; k++) {
    for (let j = 0; j < v; j++) {
      const cost = a.charAt(k) === b.charAt(j) ? 0 : 1;
      arr[k][j] = Math.min(
        1 + arr[k][j - 1],
        1 + arr[k - 1][j],
        cost + arr[k - 1][j - 1],
      );
    }
  }

  return arr[u - 1][v - 1];
}

/**
 * Add url parameters to a string url
 * @param url_str
 * @param params
 * @returns
 */
export function addUrlParams(url_str: string, params: Object) {
  let url = new URL(url_str);
  for (let key in params) {
    url.searchParams.set(key, params[key]);
  }
  return url.toString();
}

/**
 * Pause current thread
 * @param ms time in milliseconds
 * @returns
 */
export function waitFor(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitize a string
 * @param title name | title
 * @returns
 */
export function cleanFolderName(title: string): string {
  return title.split(/[\\/:"*?<>.{}|~\n\t\r]+/g)
    .join("_")
    .substring(0, 70)
    .trim(); // /!\ a trailing space at the end breaks the folder on windows
}

/**
 * Decode a string that may contain escaped unicode characters
 * @param str encoded string
 * @returns
 */
export function decodeUnicodeCharacters(str: string): string {
  const escaped = str.replace(/\"/g, '\\"');
  const repl_word = "__~perc~__";
  const no_perc = escaped.replace(/%/g, repl_word);
  const decoded = decodeURIComponent(JSON.parse('"' + no_perc + '"'));
  return decoded.replace(new RegExp(repl_word, "g"), "%");
}

/**
 * Describe a book for stdout
 * @param book
 * @param verbose
 * @returns
 */
export function resumeBook(book: Book, verbose: boolean): string {
  if (!book) {
    return "";
  }

  let str = `\n# Title : ${book.title}\n` +
    ` - Authors : ${book.authors.map((author) => author.name).join(", ")}\n` +
    ` - Source : ${book.url}\n`;

  let chap_str = ` - Chapters (${book.chapters.length})`;

  if (verbose) {
    chap_str += ":\n" + book.chapters
      .map((chapter) =>
        "  - CH " + chapter.number + " (" + chapter.pages.length +
        " pages) :: " + chapter.title + "\n"
      )
      .join("\n");
  } else {
    chap_str += "\n";
  }

  let more_text = "" +
    ` - Description : ${book.description}\n` +
    ` - Tags : ${book.tags.map((tag) => tag.name).join(", ")}\n`;

  return str + (verbose ? more_text : "") + chap_str;
}

/**
 * Read a list of ids/url from a file
 * * Each entry must be separated by a space | newline
 * @param file_path
 */
export function readListFromFile(file_path: string) {
  const separator = /[\n\t\r ]+/g;
  const content = fs.readFileSync(file_path).toString();
  const entries = content.split(separator);
  return entries
    .filter((token) => token != null && token != "");
}

/**
 * Batch a list of items
 * * Example :
 * `list = [1, 2, 3, 4, 5]`, `batch_size = 3` => `[[1, 2, 3], [4, 5]]`
 * @param list
 * @param batch_size
 * @returns
 */
export function batchAListOf<T>(list: T[], batch_size: number): T[][] {
  if (batch_size <= 0) {
    throw Error("Batch size cannot be negative or 0");
  }

  const batches: T[][] = [];
  let current_batch: T[] = [];
  let cursor = 0;
  while (cursor < list.length) {
    current_batch.push(list[cursor++]);
    if (current_batch.length == batch_size) {
      batches.push(current_batch);
      current_batch = [];
    }
  }

  // leftover
  if (current_batch.length > 0) {
    batches.push(current_batch);
  }

  return batches;
}

/**
 * @param arr
 * @returns Last value of an array
 */
export function topValueOf<T>(arr: T[]) {
  if (arr.length == 0) {
    return null;
  }
  return arr[arr.length - 1];
}

export function unionSet<T>(a: Set<T>, b: Set<T>): Set<T> {
  let result = new Set<T>();
  for (let x of a) result.add(x);
  for (let x of b) result.add(x);
  return result;
}

export function interSet<T>(a: Set<T>, b: Set<T>): Set<T> {
  let result = new Set<T>();

  for (let x of a) {
    if (b.has(x)) {
      result.add(x);
    }
  }

  for (let x of b) {
    if (a.has(x)) {
      result.add(x);
    }
  }

  return result;
}

export function feedValues(str: string, values: Record<string, string>) {
  const special = {
    "_TIMESTAMP_": Date.now().toString(),
    "_RAND_": Math.random().toString().split(".").pop(),
  };
  return str.replace(/{([A-Za-z0-9_ ]+)}/g, (match, name) => {
    const key = name.trim();
    if (key in values) {
      return values[key];
    }
    return key in special ? special[key] : match;
  });
}

export function resumeText(str: string, max = 50) {
  if (str.length < max) return str;
  const delta = str.length - max;
  const chunkEnd = Math.floor(str.length / 2 - delta / 2);
  return str.substring(0, chunkEnd) +
    " .. " + str.substring(chunkEnd + delta, str.length);
}

/**
 * * "k=v" => ["k", "v"]
 * Handle cases such as "k=v=c" => ["k", "v=c"]
 */
export function splitKeyValue(str: string): [string, string] {
  const [, value] = str.match(/=(.+)?/);
  const key = str.split("=").shift();
  return [key, value];
}

export function extractFilenameFromUrl(str: string) {
  str = str.replace(/\\/g, "/");
  return str.substring(str.lastIndexOf("/") + 1);
}
