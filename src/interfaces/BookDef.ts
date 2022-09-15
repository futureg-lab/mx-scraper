/**
 * Abstraction of a 'Book' object
 */
interface Book {
    title : string;
    title_aliases : TitleAlias[];
    description : string;
    authors : Author[];
    chapters : Chapter[];
    tags : Tag[];
    metadatas : Metadata[];
    url : string;
}

/**
 * Abstraction of a 'Chapter' owned by a Book object
 */
interface Chapter {
    title : string;
    description : string;
    url : string;
    number : number;
    pages : Page[];
}

/**
 * Abstraction of a 'Page' owned by a Chapter object
 */
interface Page {
    title : string;
    url : string;
    number : number;
    filename : string;
}

/**
 * 'Tag' abstraction, defined mainly defined by its name
 */
interface Tag {
    name : string;
    metadatas : Metadata[]; 
}

/**
 * Abstraction of a title
 */
interface TitleAlias {
    title : string;
    description : string; // ex : japanese, english, ...
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

export {Book, Chapter, Page, Tag, TitleAlias, Metadata, PluginOption, SearchOption};
 