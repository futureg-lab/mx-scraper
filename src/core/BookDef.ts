/**
 * Abstraction of a 'Book' object
 */
export interface Book {
  /**
   * Book title
   */
  title: string;

  /**
   * Book title alternatives
   */
  title_aliases: TitleAlias[];

  /**
   * Book unique id relative to the website source
   */
  source_id: string;

  /**
   * Book description | synopsis
   */
  description: string;

  /**
   * Authors of the book
   */
  authors: Author[];

  /**
   * Chapters relative to the current book
   */
  chapters: Chapter[];

  /**
   * Tags relative to the current book
   */
  tags: Tag[];

  /**
   * Metadata list relative to the current book
   */
  metadatas: Metadata[];

  /**
   * Source url of the current book
   */
  url: string;
}

/**
 * Abstraction of a 'Chapter' owned by a Book object
 */
export interface Chapter {
  /**
   * Title of the current chapter
   */
  title: string;

  /**
   * Short description of the current chapter
   */
  description: string;

  /**
   * Source url of the current chapter
   */
  url: string;

  /**
   * Strictly positive index of the current chapter relative to a book
   */
  number: number;

  /**
   * Pages associated with the current chapter
   */
  pages: Page[];
}

/**
 * Abstraction of a filter for an intermediate link
 */
export interface ParseLinkHint {
  selector: string;
  attribute: string;
}

/**
 * Abstraction of a 'Page' owned by a Chapter object
 */
export interface Page {
  /**
   * Title of the current page
   */
  title: string;

  /**
   * Source url of the currrent page
   */
  url: string;

  /**
   * Is current url a direct or intermediate link ?
   */
  intermediate_link_hint?: ParseLinkHint;

  /**
   * Strictly positive index of the current page relative to a chapter
   */
  number: number;

  /**
   * Filename corresponding to the current page (ex: page-1.jpg)
   */
  filename: string;
}

/**
 * 'Tag' abstraction characterised by its name
 */
export interface Tag {
  /**
   * Tag name
   */
  name: string;

  /**
   * Tag metadata
   */
  metadatas: Metadata[];
}

/**
 * Abstraction of a title
 */
export interface TitleAlias {
  /**
   * Title alias
   */
  title: string;

  /**
   * Title description ( ex : japanese, english, ... )
   */
  description: string;
}

/**
 * Any Metadata type should implement this export interface
 */
export interface Metadata {
  /**
   * Metadata label | name
   */
  label: string;

  /**
   * Object associated with the current label
   */
  content: any;
}

/**
 * Describes an Author
 */
export interface Author {
  /**
   * Author's name
   */
  name: string;

  /**
   * Author description (ex: 'male', 'female', '', ..)
   */
  description: string;
}

/**
 * Describes the content of a metadata file
 */
export interface DownloadBookMeta {
  /**
   * Short string to specify the engine used (ex : MXScraper v1.0.0)
   */
  engine: string;

  /**
   * Download date
   */
  date: Date;

  /**
   * Downloaded book
   */
  book: Book;
}

/**
 * Define specific behavior of a plugin
 */
export interface PluginOption {
  /**
   * If set to true, a plugin is expected to use a proxy
   */
  useFlareSolverr: boolean;

  /**
   * If defined, the value is expected to be used if a proxy is enabled
   */
  useThisSessionId?: string;
}

/**
 * Abstraction of a search option
 */
export interface SearchOption {
}
