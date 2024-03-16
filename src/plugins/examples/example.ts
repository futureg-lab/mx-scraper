import {
  Author,
  Book,
  PluginOption,
  SearchOption,
  Tag,
  TitleAlias,
} from "../../core/book.ts";
import { MXPlugin } from "../../core/mx_plugin.ts";
import { CustomRequest } from "../../utils/custom_request.ts";
import { HtmlParser } from "../../utils/html_parser.ts";

export default class Example extends MXPlugin {
  title: string = "Example";
  version: string = "1.0.0";
  targetUrl: string = "https://example.com";
  option: PluginOption = { useFlareSolverr: false };
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
    // this.request.enableRendering();
  }

  override async fetchBook(identifier: string): Promise<Book> {
    const html = await this.request.get(this.targetUrl);
    const parser = HtmlParser.use(html);
    const content = parser
      .select("body")
      .first()
      ?.asText();

    const title = parser
      .title();

    return <Book> {
      title,

      title_aliases: ["Example", "Example alias"]
        .map((alias: unknown) =>
          <TitleAlias> { title: alias, description: "" }
        ),

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

  override async search(_term: string, _option: SearchOption): Promise<Book[]> {
    return await Promise.resolve([]);
  }
}
