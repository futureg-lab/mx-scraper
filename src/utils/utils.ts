import outdent from "outdent";
import { Book } from "../core/book.ts";

/**
 * @param a
 * @param b
 * @returns Edit distance of two strings
 */
export function levenshtein(a: string, b: string): number {
  const u = a.length,
    v = b.length;
  const arr = [] as number[][];

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
 */
export function addUrlParams(urlStr: string, params: any) {
  const url = new URL(urlStr);
  for (const key in params) {
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
  const replWord = "__~perc~__";
  const noPerc = escaped.replace(/%/g, replWord);
  const decoded = decodeURIComponent(JSON.parse('"' + noPerc + '"'));
  return decoded.replace(new RegExp(replWord, "g"), "%");
}

/**
 * Describe a book for stdout
 */
export function resumeBook(book: Book, verbose: boolean): string {
  if (!book) {
    return "";
  }

  const chaptersStr = book.chapters.map((chapter) =>
    `   - CH. ${chapter.number} (${chapter.pages.length} pages) :: ${chapter.title}`
  ).join("\n");

  return outdent`
  # Title: ${book.title}
    - Authors: ${book.authors.map((author) => author.name).join(", ")}
    - Source: ${book.url}
    - Tags: ${book.tags.map((tag) => tag.name).join(", ")}
    - Description: ${book.description}
    - Chapters (${book.chapters.length})
    ${verbose ? chaptersStr : ""}

`;
}

/**
 * Read a list of ids/url from a file
 * * Each entry must be separated by a space | newline
 */
export function readListFromFile(filePath: string) {
  const separator = /[\n\t\r ]+/g;
  const content = Deno.readTextFileSync(filePath);
  const entries = content.split(separator);
  return entries
    .filter((token) => token != null && token != "");
}

/**
 * Batch a list of items
 * * Example :
 * `list = [1, 2, 3, 4, 5]`, `batch_size = 3` => `[[1, 2, 3], [4, 5]]`
 */
export function batchAListOf<T>(list: T[], batchSize: number): T[][] {
  if (batchSize <= 0) {
    throw Error("Batch size cannot be negative or 0");
  }

  const batches: T[][] = [];
  let currentBatch: T[] = [];
  let cursor = 0;
  while (cursor < list.length) {
    currentBatch.push(list[cursor++]);
    if (currentBatch.length == batchSize) {
      batches.push(currentBatch);
      currentBatch = [];
    }
  }

  // leftover
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
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
  const result = new Set<T>();
  for (const x of a) result.add(x);
  for (const x of b) result.add(x);
  return result;
}

export function interSet<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();

  for (const x of a) {
    if (b.has(x)) {
      result.add(x);
    }
  }

  for (const x of b) {
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
    return key in special ? (special as any)[key] : match;
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
  const [, value] = str.match(/=(.+)?/) ?? [];
  const key = str.split("=").shift();
  return [key!, value];
}

export function extractFilenameFromUrl(str: string) {
  str = str.replace(/\\/g, "/");
  return str.substring(str.lastIndexOf("/") + 1);
}

export function isURL(str: string) {
  try {
    const _ = new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}
