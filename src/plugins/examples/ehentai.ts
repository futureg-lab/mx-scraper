import { CheerioAPI, load } from "cheerio";
import { Author, Book, Chapter, Metadata, Page, Tag } from "../../core/book.ts";
import { MXPlugin } from "../../core/mx_plugin.ts";
import { CustomRequest } from "../../utils/custom_request.ts";
import { MXLogger } from "../../cli/mx_logger.ts";
import { addUrlParams } from "../../utils/utils.ts";

interface EHRelevantInformation {
  /**
   * Gallery title
   */
  title: string;

  /**
   * Summary example
   * * Posted:	2022-05-28 01:53
   * * Parent:	2197090
   * * Visible:	No (Replaced)
   * * Language:	Japanese
   * * File Size:	400.1 MB
   * * Length:	329 pages
   * * Favorited:	4822 times
   */
  summary: Map<string, string>;

  /**
   * (type : language, group, artist, ..any) => (values : string[])
   */
  tags: Map<string, string[]>;
}

export default class EHentai extends MXPlugin {
  title: string = "EHentai";
  author: string = "afmika";
  version: string = "1.1.0";
  targetUrl: string = "https://e-hentai.org/";
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
  }

  override async fetchBook(galleryIdOrUrl: string): Promise<Book> {
    const [galleryId, galleryToken] = this.extractIdFromPotentialUrl(
      galleryIdOrUrl,
    );
    const url = this.targetUrl + "g/" + galleryId + "/" + galleryToken;

    // url = addUrlParams(url, {nw : 'session'});

    MXLogger.infoRefresh(`[e-hentai] Fetching informations`);
    const { title, summary, tags } = await this.fetchAllRelevantsInformation(
      url,
    );

    // authors ?
    const authors: Author[] = [];
    const artists = ["artist", "group"];
    for (const key of artists) {
      const values: string[] = tags.get(key)!;
      if (values) {
        values.forEach((name: string) => {
          authors.push(
            <Author> {
              name: name,
              description: "",
            },
          );
        });
      }
    }

    // tags ?
    const bookTags: Tag[] = [];
    const tagKeys = Array.from(tags.keys());
    for (const key of tagKeys) {
      const values: string[] = tags.get(key)!;
      values.forEach((name: string) => {
        bookTags.push(
          <Tag> {
            name: name,
            metadatas: [
              <Metadata> {
                label: key,
                content: name,
              },
            ],
          },
        );
      });
    }

    // book content ?
    const book = <Book> {
      url: url,
      title: title,
      title_aliases: [],
      source_id: galleryId + "_" + galleryToken,
      authors: authors,
      chapters: [],
      description: "",
      tags: bookTags,
      metadatas: Array
        .from(summary.keys())
        .map((key) =>
          <Metadata> {
            label: key,
            content: summary.get(key),
          }
        ),
    };

    const chapter = <Chapter> {
      title: title,
      description: "",
      number: 1,
      pages: [],
      url: url,
    };

    MXLogger.infoRefresh(`[e-hentai] Fetching pages`);
    const pages = await this.fetchAllPageUrls(url);
    chapter.pages = pages;
    book.chapters.push(chapter);

    return book;
  }

  private async fetchAllRelevantsInformation(
    url: string,
  ): Promise<EHRelevantInformation> {
    // url = addUrlParams(url, {nw : 'session'});
    const responseHtml = await this.request.get(url);
    const $: CheerioAPI = load(responseHtml);
    // title ?
    const title = $("#gd2")?.text().trim();

    // summary ?
    const summary = new Map<string, string>();
    $("#gdd>table>tbody>tr").each((_, elem) => {
      const [key, value] = $(elem)
        .text()
        .split(":")
        .map((v) => v.trim());
      summary.set(key, value);
    });

    // tags ?
    const tags = new Map<string, string[]>();
    $("#taglist>table>tbody>tr").each((i, elem) => {
      const [leftTd, rightTd] = $(elem).children().toArray();
      const list = [] as Array<string>;
      $(rightTd).children().each((_, child) => {
        list.push($(child).text());
      });
      const key = $(leftTd).text().replace(/:$/, "");
      tags.set(key, list);
    });

    return <EHRelevantInformation> {
      title: title,
      summary: summary,
      tags: tags,
    };
  }

  private async fetchAllPageUrls(url: string): Promise<Page[]> {
    const pages: Page[] = [];
    const idinfos = this.extractIdFromPotentialUrl(url).join("_");
    const urlCoverSeen = new Set<string>();

    // /!\ page is 0-indexed on the website
    let currentPagination = 0, itemCount = 1;
    let doNextPage = true;

    while (doNextPage) {
      const paginationUrl = addUrlParams(url, { p: currentPagination });
      MXLogger.infoRefresh(
        `[e-hentai] ${idinfos} :: Fetching page ${currentPagination} (Count ${
          itemCount - 1
        }) ${paginationUrl}`,
      );

      const responseHtml = await this.request.get(paginationUrl);
      const $: CheerioAPI = load(responseHtml);

      // links on the covers
      const links = $("#gdt>div>div>a")
        .toArray()
        .map((elem) => $(elem).attr("href"));

      if (links.length == 0) {
        throw Error(
          "Unable to parse content " + url +
            ", try enabling proxy for this config (temporary solution)",
        ); // error
      }

      for (const link of links) {
        if (urlCoverSeen.has(link!)) {
          doNextPage = false;
          break;
        }
      }

      if (doNextPage) {
        for (const link of links) {
          urlCoverSeen.add(link!);

          const page = <Page> {
            filename: itemCount + "", // no ext yet
            title: "" + itemCount,
            number: itemCount,
            url: link,
            intermediate_link_hint: {
              selector: "#img",
              attribute: "src",
            },
          };

          pages.push(page);
          itemCount++;
        }
      }

      currentPagination++;
    }

    return pages;
  }

  private extractIdFromPotentialUrl(str: string): string[] {
    const [, gid, gtoken] = str.match(/\/(\d+)\/(\w+)/)!;
    if (!gid || !gtoken) {
      throw Error("Unable to extract gallery_id, gallery_token from " + str);
    }
    return [gid, gtoken];
  }
}
