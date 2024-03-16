import { Book, Chapter, DownloadBookMeta } from "../core/book.ts";
import { CustomRequest } from "./custom_request.ts";
import { cleanFolderName } from "./utils.ts";
import * as fs from "std/fs/mod.ts";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { config } from "../mx_configuration.ts";
import { MXPlugin } from "../core/mx_plugin.ts";
import { DynamicConfigurer } from "../cli/dynamic_configurer.ts";

/**
 * Callback used to notify download progression
 */
export interface DownloadProgressCallback {
  (
    message: string,
    current: number,
    total: number,
    percentage: number,
  ): void;
}

/**
 * Define specific options when downloading a book
 */
export interface DownloadOption {
  /**
   * If set to true, a download process is expected to continue interrupted downloads
   */
  continue: boolean;

  /**
   * If set to true, a download process is expected to download everything in parallel
   */
  parallel: boolean;

  /**
   * If set to true, a download process is expected to metadata only
   */
  metaOnly?: boolean;

  /**
   * If set to true, the downloader will use a headless browser
   */
  forceHeadless: boolean;
}

/**
 * Save Book metadata as a json file
 * * Format {engine : string, date : Date, book : Book }
 * @param folder_path
 * @param book
 */
export function createJsonDataOf(folderPath: string, book: Book) {
  const json = <DownloadBookMeta> {
    engine: `MXScraper v${DynamicConfigurer.mxVersion()}`,
    date: new Date(),
    book: book,
  };
  const text = JSON.stringify(json, null, 2);
  const fullPath = path.join(folderPath, book.source_id + ".json");
  Deno.writeTextFileSync(fullPath, text);
}

/**
 * Download a book
 * @param book
 * @param loading
 */
export async function downloadBook(
  book: Book,
  option: DownloadOption | null = null,
  loadingCallback: DownloadProgressCallback | null = null,
) {
  const request: CustomRequest = new CustomRequest();

  if (config.BROWSER.ENABLE || option?.forceHeadless) {
    request.enableRendering();
  }

  // compute total items
  let total = 0, currentItem = 0;
  for (const chapter of book.chapters) {
    total += chapter.pages.length;
  }

  // path destinations

  const baseFolderSource = getDestFolderNameUsingSourceOf(book);

  const bookTempFolderPath = path.join(
    config.DOWNLOAD_FOLDER.TEMP,
    baseFolderSource,
    folderNameFromBook(book),
  );

  const bookDownloadedFolderPath = path.join(
    config.DOWNLOAD_FOLDER.DOWNLOAD,
    baseFolderSource,
    folderNameFromBook(book),
  );

  // create chapter folder
  if (!fs.existsSync(bookTempFolderPath)) {
    Deno.mkdirSync(bookTempFolderPath, { recursive: true });
  }

  // save metadatas first
  createJsonDataOf(bookTempFolderPath, book);
  let filenameModified = false;

  const getChapterPath = (base: string, ch: Chapter) => {
    return path.join(base, cleanFolderName(ch.title));
  };

  if (!option?.metaOnly) {
    for (const chapter of book.chapters) {
      // ex: temp/mangatitle/chapter-1
      const chapterFolderTempPath = getChapterPath(
        bookTempFolderPath,
        chapter,
      );
      const chapterFolderDownPath = getChapterPath(
        bookDownloadedFolderPath,
        chapter,
      );

      if (!fs.existsSync(chapterFolderTempPath)) {
        Deno.mkdirSync(chapterFolderTempPath, { recursive: true });
      }

      createJsonDataOf(bookTempFolderPath, book);

      for (const page of chapter.pages) {
        // download
        const downloadAnyway = !(
          option != null &&
          option.continue && // if interrupted
          (
            imageExistsAtLocationIgnoreExtension(
              chapterFolderTempPath,
              page.filename,
            ) || // file already exist in 'temp'
            imageExistsAtLocationIgnoreExtension(
              chapterFolderDownPath,
              page.filename,
            ) // file already exist in 'download'
          )
        );

        let skipMsg = "";
        if (downloadAnyway) {
          // handle intermediate link
          let realPageUrl = page.url;
          if (page.intermediate_link_hint) {
            // intermediate link
            const [realUrl, computedExt] = await MXPlugin
              .autoScanIndirectLink(
                request,
                page.url,
                page.intermediate_link_hint,
              );
            // set proper filename
            const [pageFilename, ext] = page.filename.split(".");
            if (!pageFilename) { // undefined filename
              page.filename = page.number + "." + computedExt;
            } else if (pageFilename && !ext) {
              page.filename = pageFilename + "." + computedExt;
            } // else { filename properly defined }
            realPageUrl = realUrl;
            filenameModified = true;
          }
          const destPath = path.join(
            chapterFolderTempPath,
            page.filename,
          );
          await request.downloadImage(realPageUrl, destPath);
        } else {
          skipMsg = "Skipped";
        }
        // progress status
        const message =
          `CH. ${chapter.number} - Page ${page.number}/${chapter.pages.length} ${skipMsg}`;

        currentItem++;
        if (loadingCallback) {
          loadingCallback(
            message,
            currentItem,
            total,
            Math.round(100. * currentItem / total),
          );
        }
      }
    }
  }

  if (filenameModified) {
    createJsonDataOf(bookTempFolderPath, book);
  }

  // move if done
  if (loadingCallback) {
    loadingCallback("[Done]", total, total, 100);
  }

  if (!fs.existsSync(bookDownloadedFolderPath)) {
    await Deno.mkdir(path.dirname(bookDownloadedFolderPath), {
      recursive: true,
    });
    await Deno.rename(bookTempFolderPath, bookDownloadedFolderPath);
  }
}

/**
 * Check if a file exists already
 * @param location
 * @param index
 */
export function imageExistsAtLocationIgnoreExtension(
  location: string,
  canonicalName: string,
) {
  if (!fs.existsSync(location)) {
    return false;
  }

  const content = Array.from(Deno.readDirSync(location));
  return content
    .filter(({ name }) => {
      return name.startsWith(canonicalName);
    })
    .length > 0;
}

/**
 * Compute the corresponding sha256 signature of a book
 * @param book
 * @returns
 */
export function computeSignature(book: Book): string {
  const input = book.title + book.source_id + book.url;
  return "mx_" + crypto
    .createHash("sha256")
    .update(input)
    .digest("hex");
}

/**
 * Compute the corresponding sha256 signature of a query string
 * @param query
 * @param pluginName
 * @returns
 */
export function computeSignatureQuery(
  query: string,
  pluginName: string,
): string {
  return "mx_" + crypto
    .createHash("sha256")
    .update(query + pluginName)
    .digest("hex");
}

export function hashResume(str: string): string {
  str = str == "" ? "?" : str;
  return "res_" + crypto
    .createHash("sha256")
    .update(str)
    .digest("hex")
    .substring(0, 7);
}

/**
 * Compute a substring of length 10 of the corresponding hash of a book
 * @param book
 * @returns
 */
export function computeFolderSuffix(book: Book): string {
  return computeSignature(book).substring(0, 10);
}

/**
 * Compute a unique name folder based on the title and the hash
 * @param book
 * @returns
 */
export function folderNameFromBook(book: Book): string {
  const prefix = cleanFolderName(book.title);
  const suffix = computeFolderSuffix(book);
  return `${prefix} (${suffix})`;
}

/**
 * Get the base folder name based on the source `book.url`
 * , returns `local` if `book.url` is `undefined` or `null`
 * @param book
 * @returns
 */
export function getDestFolderNameUsingSourceOf(book: Book) {
  if (!book.url) {
    return "local";
  }
  const url = new URL(book.url);
  const [y, x] = url.hostname.split(".").reverse();
  return x + "." + y;
}
