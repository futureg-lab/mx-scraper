/**
 * Abstraction of a 'Book' object
 */
interface Book {
    title : string;
    description : string;
    authors : Author[];
    chapters : Chapter[];
    metadatas : Metadata[];
}

/**
 * Abstraction of a 'Chapter' owned by a Book object
 */
interface Chapter {
    title : string;
    description : string;
    url : string;
    number : number;
    pages : Page;
    parent : Book;
}

/**
 * Abstraction of a 'Page' owned by a Chapter object
 */
interface Page {
    title : string;
    url : string;
    number : number;
    parent : Chapter;
}

/**
 * 'Tag' abstraction, defined mainly defined by its name
 */
interface Tag {
    name : string;
    metadatas : Metadata[]; 
}

/**
 * Any Metadata type should implement this interface
 */
interface Metadata {
    label : string;
    content : any;
}

/**
 * Describes an Author
 */
interface Author {
    name : string;
    description : string;
}

/**
 * Abstraction of the 'any' type
 */
interface PluginOption extends Object {
    useFlareSolverr : boolean;
    useThisSessionId? : string;
}

interface SearchOption extends Object {
}

export {Book, Chapter, Page, Tag, Metadata, PluginOption, SearchOption};
 