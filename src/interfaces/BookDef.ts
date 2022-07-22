interface Book {
    title : string;
    description : string;
    authors : Author[];
    chapters : Chapter[];
    metadatas : Metadata[];
}

interface Chapter {
    title : string;
    description : string;
    url : string;
    number : number;
    pages : Page;
    parent : Book;
}

interface Page {
    title : string;
    url : string;
    number : number;
    parent : Chapter;
}

interface Tag {
    name : string;
    metadatas : Metadata[]; 
}

interface Metadata {
    label : string;
    content : any;
}

interface Author {
    name : string;
    description : string;
}

interface Option extends Object {
}

export {Book, Chapter, Page, Tag, Metadata, Option};
 