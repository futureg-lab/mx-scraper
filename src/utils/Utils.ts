import { Book } from "../interfaces/BookDef";

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

export function cleanFolderName (title : string) : string  {
	return title.split(/[\\/:"*?<>.{}|~\n\t\r]+/g)
				.join('_')
				.substring(0, 70)
				.trim(); // /!\ a trailing space at the end breaks the folder on windows
}

export function decodeUnicodeCharacters (str : string) : string {
    const escaped = str.replace (/\"/g, '\\"');
    return decodeURIComponent (JSON.parse('"' + escaped + '"'));
}

export function resumeBook (book : Book) : string  {
    let str = `# Title : ${book.title}\n`
        + ` - Authors : ${book.authors.join(', ')}\n`
        + ` - Description : ${book.description}\n`
        + ` - Source : ${book.url}\n`
        + ` - Tags : ${book.tags.map(tag => tag.name).join(', ')}\n`
        + ` - Chapters (${book.chapters.length}): \n${
            book.chapters
                .map(chapter => '  - CH ' + chapter.number + ' (' + chapter.pages.length + ' pages) :: ' + chapter.title + '\n')
                .join('\n')
        }`;
    return str;
}