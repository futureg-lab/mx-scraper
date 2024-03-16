import { CheerioAPI, load } from "cheerio";
import { MXLogger } from "../../cli/mx_logger.ts";
import { Book, Chapter, Page, SearchOption, Tag } from "../../core/book.ts";
import { MXPlugin } from "../../core/mx_plugin.ts";
import { CustomRequest } from "../../utils/custom_request.ts";

export default class GPrincess extends MXPlugin {
  title: string = "GPrincess";
  version: string = "1.0.0";
  targetUrl: string = "https://idol.gravureprincess.date/";
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
  }

  override async fetchBook(url: string): Promise<Book> {
    MXLogger.infoRefresh(`[${this.title}] Fetching informations`);

    const [, galleryId] = this.extractRelevantIdFrom(url);
    const responseHtml = await this.request.get(url);
    const $: CheerioAPI = load(responseHtml);

    const title = $(".post-title")?.text().trim();
    const tags = [
      "seiyuu",
      "VA",
      "photoshoot",
      "gravure",
      "idol",
      ...this.extractTagsFromTitle(title),
    ];

    const book = <Book> {
      url: url,
      title: title,
      title_aliases: [],
      source_id: galleryId,
      authors: [],
      chapters: [],
      description: "",
      tags: tags.map((tag) =>
        <Tag> {
          name: tag,
          metadatas: [],
        }
      ),
      metadatas: [],
    };

    const chapter = <Chapter> {
      title: title,
      description: "",
      number: 1,
      pages: [],
      url: url,
    };

    const pages = <Page[]> [];
    const injectInPage = (elem: any, index: number) => {
      const link = $(elem).attr("href")!;
      let ext = "jpg";
      const deduced = link.split(".").pop()!;
      // jpeg, png, gif, tiff, webp
      if (deduced.length < 5) {
        ext = deduced;
      }
      const num = index + 1;
      const page = <Page> {
        filename: num + "." + ext,
        number: num,
        title: "" + num,
        url: link,
      };

      pages.push(page);
    };

    let pageList = $(".post-body>div>a").toArray();
    if (!pageList || pageList.length == 0) {
      pageList = $(".post-body>a").toArray(); // weird but..
    }

    pageList.forEach(injectInPage);

    chapter.pages = pages;
    book.chapters.push(chapter);

    return book;
  }

  private extractRelevantIdFrom(url: string): string[] {
    const link = new URL(url);
    const testAgainst = new URL(this.targetUrl);
    if (link.hostname != testAgainst.hostname) {
      throw Error("hostname doesn't match");
    }
    const gid = link.pathname.replace(/[\/]+/g, "-");
    return [link.hostname, gid];
  }

  private extractTagsFromTitle(title: string): string[] {
    return title
      .replace(/[(),;/-]/g, " ")
      .split(/[ \t]+/g)
      .filter((str) => str != "");
  }

  override async search(_term: string, _option: SearchOption): Promise<Book[]> {
    return await Promise.resolve([]);
  }
}
