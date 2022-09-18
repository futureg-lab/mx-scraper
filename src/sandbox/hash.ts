import { Book } from "../core/BookDef";
import { computeFolderSuffix, computeSignature, folderNameFromBook } from "../utils/Downloader";

const book : Book = {
    title : "Some title1",
    source_id : "1234",
    title_aliases : [],
    authors : [],
    chapters : [],
    tags : [],
    description : '',
    url : "http://url/to/title",
    metadatas : []
};

const signature = computeSignature (book);
const folder_name = folderNameFromBook (book);


console.info ('signature', signature);
console.info ('folder', folder_name);