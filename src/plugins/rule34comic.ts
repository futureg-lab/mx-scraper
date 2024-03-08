import {
  Author,
  Book,
  Chapter,
  Page,
  PluginOption,
  SearchOption,
  Tag,
  TitleAlias,
} from "../core/BookDef";
import { MXPlugin } from "../core/MXPlugin";
import { CustomRequest } from "../utils/CustomRequest";
import { HtmlParser } from "../utils/HtmlParser";

export class Rule34Comic extends MXPlugin {
  title: string = "Rule34Comic";
  author: string = "afmika";
  version: string = "1.0.0";
  target_url: string = "https://rule34comic.party/";
  option: PluginOption;
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
  }

  override async fetchBook(urlOrChunk: string): Promise<Book> {
    const [id, canonTitle] = this.parseIdentifier(urlOrChunk);
    // get the infos
    const mainUrl = this.target_url + "comics/" + id + "/" + canonTitle;
    const infoHtml = await this.request.get(mainUrl);
    const parser = HtmlParser.use(infoHtml);
    const title = parser.select(".title_video").first().asText();
    const infosList = parser.select(".video_tools>div.col")
      .all()
      .map((item) => item.asText());
    const authors = [] as Array<string>, tags = [] as Array<string>;
    for (const info of infosList) {
      if (/(author|artist)s?\s*:/i.test(info)) {
        authors.push(
          ...info.split(":").pop().trim().split(",").map((tag) => tag.trim()),
        );
      }
      if (/tags?\s*:/i.test(info)) {
        tags.push(
          ...info.split(":").pop().trim().split(",").map((tag) => tag.trim()),
        );
      }
    }

    // we can infer all pages from the first one
    const pageUrl = this.target_url + "read/" + id + "/" + canonTitle + "/1";
    const pageHtml = await this.request.get(pageUrl);
    const nodes = HtmlParser.use(pageHtml)
      .select("div.thumbs-gallery-read>img")
      .all();

    const pages = [] as Array<Page>;
    for (let i = 0; i < nodes.length; i++) {
      // first page (prior to page js being executed) => data-original
      const url = nodes[i].attr("data-original") ?? nodes[i].attr("data-src");
      if (url) {
        const [, ext] = url.match(/[\w\d_\-]+\.(\w+)\/?$/) ?? [];
        const extension = ext ?? "jpg";
        const pageCount = i + 1;
        pages.push({
          title: title + " #" + pageCount,
          filename: pageCount + "." + extension,
          number: pageCount,
          url,
        });
      }
    }

    const chapter = {
      title,
      description: "",
      number: 1,
      pages,
      url: mainUrl,
    } as Chapter;

    return <Book> {
      title,

      title_aliases: [title]
        .map((alias: any) => <TitleAlias> { title: alias, description: "" }),

      url: mainUrl,
      source_id: [id, canonTitle].join("_"),

      authors: authors
        .map((author) => <Author> { name: author, description: "" }),

      chapters: [chapter],
      description: "",
      metadatas: [],

      tags: tags
        .map((tag) => <Tag> { name: tag, metadatas: [] }),
    };
  }

  private parseIdentifier(url: string): [string, string] {
    const [, id, name] = url.match(/([0-9]+)\/(.+)/);
    if (id && name) {
      return [id, name.split("/").shift()];
    }
    throw Error(`unable to parse id/name from ${url}`);
  }

  override async search(term: string, option: SearchOption): Promise<Book[]> {
    return [];
  }
}
