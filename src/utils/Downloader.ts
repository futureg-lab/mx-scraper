import { Book, Chapter } from "../interfaces/BookDef";
import { CustomRequest } from "./CustomRequest";
import { cleanFolderName } from "./Utils";
import * as path from 'path';
import * as fs from 'fs';
import { config } from "../environment";

interface DownloadProgressCallback {
    (current : number, total : number, percentage : number) : void
}

interface DownloadOption {
    start_chapter : number;
    end_chapter : number;
    continue : boolean;
    parallel : boolean;
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
    const start_index = option ? (option.start_chapter - 1) : 0;
    const end_index = option ? (option.end_chapter - 1) : (book.chapters.length - 1);

    // compute total items
    let total = 0, current_item = 0;
    for (let i = start_index; i <= end_index; i++) {
        total += book.chapters[i].pages.length;
    }

    // download
    const book_temp_folder_path = path.join(
        config.DOWNLOAD_FOLDER.TEMP,
        cleanFolderName (book.title)
    );

    if (!fs.existsSync(book_temp_folder_path))
        fs.mkdirSync (book_temp_folder_path, {recursive : true});

    for (let i = start_index; i <= end_index; i++) {
        
        const chapter = book.chapters [i];
        // ex: temp/mangatitle/chapter-1
        const chapter_folder_path = path.join(
            book_temp_folder_path,
            cleanFolderName (chapter.title)
        );

        if (!fs.existsSync(chapter_folder_path))
            fs.mkdirSync (chapter_folder_path, {recursive : true});

        for (let page of chapter.pages) {
            const dest_path = path.join (
                chapter_folder_path,
                page.filename
            );

            // download
            const should_continue = option != null 
                    && option.continue 
                    && fs.existsSync (dest_path);
            
            if (!should_continue){
                await request.download (page.url, dest_path);
            }
            
            // progress status
            current_item++;
            if (loading_callback)
                loading_callback (current_item, total, Math.round (100. * current_item / total))
        }

    }

}