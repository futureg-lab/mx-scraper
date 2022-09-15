import { Book, Chapter, DownloadBookMeta } from "../interfaces/BookDef";
import { CustomRequest } from "./CustomRequest";
import { cleanFolderName, waitFor } from "./Utils";
import * as path from 'path';
import * as fs from 'fs';
import * as fsextra from 'fs-extra';
import { config } from "../environment";
import { MXScraper } from "../MXScraper";

export interface DownloadProgressCallback {
    (
        message : string,
        current : number, 
        total : number, 
        percentage : number
    ) : void
}

export interface DownloadOption {
    continue : boolean;
    parallel : boolean;
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
    const book_temp_folder_path = path.join(
        config.DOWNLOAD_FOLDER.TEMP,
        cleanFolderName (book.title)
    );
    const book_downloaded_folder_path = path.join(
        config.DOWNLOAD_FOLDER.DOWNLOAD,
        cleanFolderName (book.title)
    );
    // create chapter folder
    if (!fs.existsSync (book_temp_folder_path))
        fs.mkdirSync (book_temp_folder_path, {recursive : true});

    // save metadatas first
    createJsonDataOf (book_temp_folder_path, book);

    for (let chapter of book.chapters) {
        // ex: temp/mangatitle/chapter-1
        const chapter_folder_path = path.join(
            book_temp_folder_path,
            cleanFolderName (chapter.title)
        );

        if (!fs.existsSync(chapter_folder_path))
            fs.mkdirSync (chapter_folder_path, {recursive : true});
        
        createJsonDataOf (book_temp_folder_path, book);
                
        for (let page of chapter.pages) {
            const dest_path = path.join (
                chapter_folder_path,
                page.filename
            );
            // download
            const download_anyway = !(
                option != null 
                && option.continue // if interrupted
                && fs.existsSync (dest_path) // file already exist
            );
            if (download_anyway)
                await request.download (page.url, dest_path);
            // progress status
            let message = `CH. ${chapter.number} - Page ${page.number}/${chapter.pages.length}`;

            current_item++;
            if (loading_callback)
                loading_callback (message, current_item, total, Math.round (100. * current_item / total))
        }
    }

    // move if done
    if (loading_callback)
        loading_callback ('Moving files', total, total, 100);
    
    if (!fs.existsSync (book_downloaded_folder_path))
        fsextra.moveSync (book_temp_folder_path, book_downloaded_folder_path, {overwrite : true});

}