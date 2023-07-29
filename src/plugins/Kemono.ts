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
import { HtmlParser } from "../utils/HtmlParser";
import { cleanFolderName } from "../utils/Utils";

export class Kemono extends MXPlugin {
  title: string = "Kemono";
  author: string = "afmika";
  version: string = "1.0.0";
  target_url: string = "https://kemono.party/";
  resource: string = "https://c6.kemono.party/";

  option: PluginOption;
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
    this.request.enableRendering();
    this.request.enableReUsingBrowserInstance();
  }

  override async fetchBook(url: string): Promise<Book> {
    const html = await this.request.get(url);
    const parser = HtmlParser.use(html);
    const title = parser
      .select("title")
      .first()
      .asText()
      ?.trim();
    if (title == undefined) {
      throw Error(`title not found for ${url}`);
    }

    MXLogger.infoRefresh("[Kemono] title: ", title);

    const pages = new Array<Page>();
    const posts = parser
      .select(".post-card>a")
      .map((node) => node.attr("href")) as Array<string>;
    let count = 1;
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const postLink = this.fromRoot(post);
      const postHtml = await this.request.get(postLink);
      const result = HtmlParser
        .use(postHtml)
        .select(".post__thumbnail>a>img")
        .map<string>((node) => {
          const url = node.attr("src");
          const identifier = url.match(/data(.*)/).shift();
          return this.fromRoot(identifier, this.resource);
        });
      MXLogger.infoRefresh(
        "[Kemono] Fetching post",
        `${i + 1}/${posts.length}`,
        postLink,
        `(total ${result.length})`,
      );

      for (let imageUrl of result) {
        const [name, ext] = imageUrl
          .substring(imageUrl.lastIndexOf("/") + 1)
          .split(".");
        pages.push({
          filename: `${name}.${ext}`,
          number: count++,
          title: name,
          url: imageUrl,
        });
      }
    }

    const chapter = <Chapter> {
      title: title,
      pages: pages,
      number: 1,
      url: url,
      description: "",
    };

    const tags = this.extractTagsFromTitle(title);

    const book = <Book> {
      title: title,
      title_aliases: [],
      url: url,
      source_id: this.genId(url),
      authors: [],
      chapters: [chapter],
      description: "",
      metadatas: [],
      tags: tags
        .map((tag) => <Tag> { name: tag, metadatas: [] }),
    };
    console.log(JSON.stringify(book, null, 2));
    return book;
  }

  private genId(url: string) {
    const [, site, uid] = url.match(/party\/(.+)\/user\/(.+)/);
    return cleanFolderName(`${site}_${uid}`);
  }

  private fromRoot(url_chunk: string, root: string = this.target_url) {
    return (root + url_chunk).replace(/\/+/g, "/");
  }

  private extractTagsFromTitle(title: string): string[] {
    return title
      .split(/[ \t|]+/g)
      .filter((str) => str != "");
  }

  override async search(term: string, option: SearchOption): Promise<Book[]> {
    return [];
  }
}
