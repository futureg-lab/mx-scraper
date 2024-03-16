import {
  Author,
  Book,
  Chapter,
  Page,
  SearchOption,
  Tag,
  TitleAlias,
} from "../../core/book.ts";
import { MXPlugin } from "../../core/mx_plugin.ts";
import { CustomRequest } from "../../utils/custom_request.ts";
import { HtmlParser } from "../../utils/html_parser.ts";
import { addUrlParams } from "../../utils/utils.ts";

export default class HentaiKage extends MXPlugin {
  title: string = "HentaiKage";
  version: string = "1.0.0";
  targetUrl: string = "https://hentaikage.com";
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
  }

  override async fetchBook(identifierOrUrl: string): Promise<Book> {
    const identifier = this.extractIdFromPotentialUrl(identifierOrUrl);
    const bookUrl = this.targetUrl + "/" + identifier;
    const html = await this.request.get(bookUrl);
    const parser = HtmlParser.use(html);
    const [title, ...aliases] = parser
      .select(".vcard>h1")
      .all()
      .map((item) => item.asText());

    const metadatas = parser
      .select(".meta>.element>h2>a")
      .all();
    const tags = metadatas.map((item) =>
      <Tag> {
        name: item.asText(),
        metadatas: [
          { label: "url", content: item.attr("href") },
        ],
      }
    );
    const authorReg = /(group|author|artist)/i;
    const authors = metadatas
      .filter((item) => {
        const url = item.attr("href")!;
        const cgUrl = /artist-cg/.test(url);
        return !cgUrl && authorReg.test(url);
      })
      .map((item) =>
        <Author> {
          name: item.asText(),
          description: item.attr("href")!.match(authorReg)?.[0] ?? "",
        }
      );

    const pages = await this.inferPages(bookUrl);
    const chapter = {
      number: 1,
      title,
      pages,
      url: bookUrl,
      description: "",
    } as Chapter;

    return <Book> {
      title: title ?? parser.title(),

      title_aliases: aliases
        .map((alias: any) => <TitleAlias> { title: alias, description: "" }),

      url: bookUrl,
      source_id: identifier,

      chapters: [chapter],

      metadatas: [],
      description: "",
      authors,
      tags,
    };
  }

  private async inferPages(baseUrl: string) {
    const url = addUrlParams(baseUrl, { action: "view", i: 1 });
    const html = await this.request.get(url);
    const parser = HtmlParser.use(html);
    const thirdScript = parser
      .select("script")
      .nth(3)!
      .asText();

    const baseMediaUrl = parser
      .select(".view>img")
      .first()!
      .attr("data-i")!
      .split("/")
      .slice(0, -1)
      .join("/");

    const data = thirdScript
      .match(/(const|let)\s+galleryData\s*=\s*'({.*})';.*JSON\.parse'?/)
      ?.[2]!;

    try {
      const pagesJson = JSON.parse(data);
      return Object.entries(pagesJson)
        .map(([title, filename], index) =>
          <Page> {
            title,
            filename,
            url: baseMediaUrl + "/" + filename,
            number: index + 1,
          }
        );
    } catch (err) {
      throw new Error(`cannot infer pages at ${url}, ${err.message}`);
    }
  }

  private extractIdFromPotentialUrl(str: string) {
    const [code] = str.match(/([0-9]+)/)!;
    return code;
  }

  override async search(_term: string, _option: SearchOption): Promise<Book[]> {
    return await Promise.resolve([]);
  }
}
