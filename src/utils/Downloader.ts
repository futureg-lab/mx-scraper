import { Book, Chapter, DownloadBookMeta } from "../core/BookDef";
import { CustomRequest } from "./CustomRequest";
import { cleanFolderName, waitFor } from "./Utils";
import * as path from 'path';
import * as fs from 'fs';
import * as fsextra from 'fs-extra';
import * as crypto from 'crypto';
import { config } from "../environment";
import { MXScraper } from "../core/MXScraper";


/**
 * Callback used to notify download progression
 */
export interface DownloadProgressCallback {
    (
        message : string,
        current : number, 
        total : number, 
        percentage : number
    ) : void
}

/**
 * Define specific options when downloading a book
 */
export interface DownloadOption {
    /**
     * If set to true, a download process is expected to continue interrupted downloads
     */
    continue : boolean;

    /**
     * If set to true, a download process is expected to download everything in parallel
     */
    parallel : boolean;

    /**
     * If set to true, a download process is expected to metadata only
     */
    meta_only? : boolean;
}


/**
 * Save Book metadata as a json file
 * * Format {engine : string, date : Date, book : Book }
 * @param folder_path 
 * @param book 
 */
export function createJsonDataOf (folder_path : string, book : Book) {
    const json = <DownloadBookMeta>{
        engine : 'MXScraper v' + MXScraper.version,
        date : new Date (),
        book : book
    };
    const text = JSON.stringify (json, null, 2);
    const full_path = path.join (folder_path, book.source_id + '.json');
    fs.writeFileSync (full_path, text);
}

/**
 * Download a book
 * @param book 
 * @param loading 
 */
export async function downloadBook (
    book : Book, 
    option : DownloadOption = null, 
    loading_callback : DownloadProgressCallback = null
) {    
    const request : CustomRequest = new CustomRequest ();

    // compute total items
    let total = 0, current_item = 0;
    for (let chapter of book.chapters)
        total += chapter.pages.length;

    // path destinations

    const base_folder_source = getDestFolderNameUsingSourceOf (book);

    const book_temp_folder_path = path.join(
        config.DOWNLOAD_FOLDER.TEMP,
        base_folder_source,
        folderNameFromBook (book),
    );

    const book_downloaded_folder_path = path.join(
        config.DOWNLOAD_FOLDER.DOWNLOAD,
        base_folder_source,
        folderNameFromBook (book)
    );

    // create chapter folder
    if (!fs.existsSync (book_temp_folder_path))
        fs.mkdirSync (book_temp_folder_path, {recursive : true});

    // save metadatas first
    createJsonDataOf (book_temp_folder_path, book);

    const getChapterPath = (base : string, ch : Chapter) => {
        return path.join (base, cleanFolderName (ch.title));
    } 

    if (!option.meta_only) {
        for (let chapter of book.chapters) {
            // ex: temp/mangatitle/chapter-1
            // there is no need
            const chapter_folder_temp_path = getChapterPath (
                book_temp_folder_path,
                chapter
            );
            const chapter_folder_down_path = getChapterPath (
                book_downloaded_folder_path,
                chapter
            );
    
            if (!fs.existsSync (chapter_folder_temp_path))
                fs.mkdirSync (chapter_folder_temp_path, {recursive : true});
            
            createJsonDataOf (book_temp_folder_path, book);
                    
            for (let page of chapter.pages) {
                const dest_path = path.join (
                    chapter_folder_temp_path,
                    page.filename
                );
                const dest_down_path = path.join (
                    chapter_folder_down_path,
                    page.filename
                );
                // download
                const download_anyway = !(
                    option != null 
                    && option.continue // if interrupted
                    && (
                       fs.existsSync (dest_path) // file already exist in 'temp'
                    || fs.existsSync (dest_down_path) // file already exist in 'download'
                    )
                );
                let skip_msg = '';
                if (download_anyway)
                    await request.download (page.url, dest_path);
                else
                    skip_msg = 'Skipped';
                // progress status
                let message = `CH. ${chapter.number} - Page ${page.number}/${chapter.pages.length} ${skip_msg}`;
    
                current_item++;
                if (loading_callback)
                    loading_callback (message, current_item, total, Math.round (100. * current_item / total))
            }
        }
    }

    // move if done
    if (loading_callback)
        loading_callback ('[Done]', total, total, 100);
    
    if (!fs.existsSync (book_downloaded_folder_path))
        fsextra.moveSync (book_temp_folder_path, book_downloaded_folder_path, {overwrite : true});

}

/**
 * Compute the corresponding sha256 signature of a book
 * @param book 
 * @returns 
 */
export function computeSignature (book : Book) : string {
    const input = book.title + book.source_id + book.url;
    return 'mx_' + crypto
                    .createHash ('sha256')
                    .update (input)
                    .digest ('hex');
}

/**
 * Compute a substring of length 10 of the corresponding hash of a book
 * @param book 
 * @returns 
 */
export function computeFolderSuffix (book : Book) : string {
    return computeSignature (book).substring (0, 10);
}

/**
 * Compute a unique name folder based on the title and the hash
 * @param book 
 * @returns 
 */
export function folderNameFromBook (book : Book) : string {
    const prefix = cleanFolderName (book.title);
    const suffix = computeFolderSuffix (book);
    return `${prefix} (${suffix})`;
}

/**
 * Get the base folder name based on the source `book.url`
 * , returns `local` if `book.url` is `undefined` or `null` 
 * @param book 
 * @returns
 */
export function getDestFolderNameUsingSourceOf (book : Book) {
    if (!book.url)
        return 'local';
    const url = new URL (book.url);
    const [y, x, ] = url.hostname.split('.').reverse();
    return x + '.' + y;
}