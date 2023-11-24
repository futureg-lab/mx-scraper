import {
  Author,
  Book,
  PluginOption,
  SearchOption,
  Tag,
  TitleAlias,
} from "../core/BookDef";
import { MXPlugin } from "../core/MXPlugin";
import { CustomRequest } from "../utils/CustomRequest";
import { HtmlParser } from "../utils/HtmlParser";

export class Example extends MXPlugin {
  title: string = "Example";
  author: string = "afmika";
  version: string = "1.0.0";
  target_url: string = "https://example.com";
  option: PluginOption;
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
    this.request.enableRendering();
  }

  override async fetchBook(identifier: string): Promise<Book> {
    const html = await this.request.get(this.target_url);
    const parser = HtmlParser.use(html);
    const content = parser
      .select("body")
      .first()
      .asText();

    return <Book> {
      title: "Example",

      title_aliases: ["Example", "Example alias"]
        .map((alias: any) => <TitleAlias> { title: alias, description: "" }),

      url: identifier,
      source_id: identifier,

      authors: ["Shiki", "Ayumu", "Nanachi"]
        .map((author) => <Author> { name: author, description: "" }),

      chapters: [],
      description: content,
      metadatas: [],

      tags: ["Example tag 1", "Another tag"]
        .map((tag) => <Tag> { name: tag, metadatas: [] }),
    };
  }

  override async search(term: string, option: SearchOption): Promise<Book[]> {
    return [];
  }
}
