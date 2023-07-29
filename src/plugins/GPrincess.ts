import { CheerioAPI, load } from "cheerio";
import { MXLogger } from "../cli/MXLogger";
import {
  Book,
  Chapter,
  Page,
  PluginOption,
  SearchOption,
  Tag,
} from "../core/BookDef";
import { MXPlugin } from "../core/MXPlugin";
import { CustomRequest } from "../utils/CustomRequest";

export class GPrincess extends MXPlugin {
  title: string = "GPrincess";
  author: string = "afmika";
  version: string = "1.0.0";
  target_url: string = "https://idol.gravureprincess.date/";
  option: PluginOption;
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
  }

  override async fetchBook(url: string): Promise<Book> {
    MXLogger.infoRefresh(`[${this.title}] Fetching informations`);

    const [, gallery_id] = this.extractRelevantIdFrom(url);
    const response_html = await this.request.get(url);
    const $: CheerioAPI = load(response_html);

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
      source_id: gallery_id,
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
      const link = $(elem).attr("href");
      let ext = "jpg";
      const deduced = link.split(".").pop();
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

    let page_list = $(".post-body>div>a").toArray();
    if (!page_list || page_list.length == 0) {
      page_list = $(".post-body>a").toArray(); // weird but..
    }

    page_list.forEach(injectInPage);

    chapter.pages = pages;
    book.chapters.push(chapter);

    return book;
  }

  private extractRelevantIdFrom(url: string): string[] {
    const link = new URL(url);
    const test_against = new URL(this.target_url);
    if (link.hostname != test_against.hostname) {
      throw Error("hostname doesn't match");
    }
    const gid = link.pathname.replace(/[\/]+/g, "-");
    return [link.hostname, gid];
  }

  private extractTagsFromTitle(title: string): string[] {
    return title
      .replace(/[()(),;/-]/g, " ")
      .split(/[ \t]+/g)
      .filter((str) => str != "");
  }

  override async search(term: string, option: SearchOption): Promise<Book[]> {
    return [];
  }
}
