import { Book } from "../core/BookDef";

/**
 * @param a
 * @param b 
 * @returns Edit distance of two strings
 */
export function levenshtein (a: string, b: string) : number{
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
                1    + arr[k][j - 1], 
                1    + arr[k - 1][j],
                cost + arr[k - 1][j - 1]
            );
        }
    }

    return arr[u - 1][v - 1];
}

/**
 * Pause current thread
 * @param ms time in milliseconds
 * @returns 
 */
export function waitFor (ms : number) {
    return new Promise (resolve => setTimeout (resolve, ms));
}

/**
 * Sanitize a string
 * @param title name | title
 * @returns 
 */
export function cleanFolderName (title : string) : string  {
	return title.split(/[\\/:"*?<>.{}|~\n\t\r]+/g)
				.join('_')
				.substring(0, 70)
				.trim(); // /!\ a trailing space at the end breaks the folder on windows
}

/**
 * Decode a string that may contain escaped unicode characters
 * @param str encoded string
 * @returns 
 */
export function decodeUnicodeCharacters (str : string) : string {
    const escaped = str.replace (/\"/g, '\\"');
    const repl_word = '__~perc~__';
    const no_perc = escaped.replace (/%/g, repl_word);
    const decoded = decodeURIComponent (JSON.parse('"' + no_perc + '"'));
    return decoded.replace (new RegExp(repl_word, 'g'), '%');
}

/**
 * Describe a book for stdout
 * @param book 
 * @param verbose 
 * @returns 
 */
export function resumeBook (book : Book, verbose : boolean) : string  {
    if (!book)
        return '';

    let str = `# Title : ${book.title}\n`
        + ` - Authors : ${book.authors.map(author => author.name).join(', ')}\n`
        + ` - Source : ${book.url}\n`;
    
    let chap_str =  ` - Chapters (${book.chapters.length})`;

    if (verbose) 
        chap_str += ':\n' + book.chapters
            .map(chapter => '  - CH ' + chapter.number + ' (' + chapter.pages.length + ' pages) :: ' + chapter.title + '\n')
            .join('\n');
    else
        chap_str += '\n';

    let more_text = ''
        + ` - Description : ${book.description}\n`
        + ` - Tags : ${book.tags.map(tag => tag.name).join(', ')}\n`

    return str + (verbose ? more_text : '') + chap_str;
}