import {
  Author,
  Book,
  Chapter,
  Metadata,
  Page,
  PluginOption,
  SearchOption,
  Tag,
} from "../../core/book.ts";
import { MXPlugin } from "../../core/mx_plugin.ts";
import { CustomRequest } from "../../utils/custom_request.ts";
import { HtmlParser } from "../../utils/html_parser.ts";

export default class Batoto extends MXPlugin {
  title: string = "Batoto";
  version: string = "1.0.0";
  targetUrl: string = "https://mto.to/";
  option: PluginOption = { useFlareSolverr: false };
  request: CustomRequest;

  constructor() {
    super();
    this.request = new CustomRequest();
  }

  private async fetchPages(chapterIdentifier: string) {
    const chapterId = this.parseIdentifier(chapterIdentifier);
    const chapterUrl = `${this.targetUrl}chapter/${chapterId}`;
    const html = await this.request.get(chapterUrl);

    const scriptCode = HtmlParser.use(html)
      .select("script")
      .where("text: %imgHttps%")
      .first()!
      .asText();

    const rawPages = JSON.parse(
      scriptCode.match(/const\s*imgHttps\s*=(.+|\s+)?;/)!.at(1)!,
    ) as Array<string>;

    return [
      chapterUrl,
      rawPages.map((url, index) => {
        const [, ext] = url.match(/\.([A-Za-z0-9]+)$\/?/) ?? [, "jpg"];
        const pageCount = index + 1;
        return <Page> {
          filename: `${pageCount}.${ext}`,
          number: pageCount,
          title: pageCount.toString(),
          url,
        };
      }),
    ];
  }

  override async fetchBook(identifier: string): Promise<Book> {
    const bookId = this.parseIdentifier(identifier);
    const bookUrl = `${this.targetUrl}series/${bookId}`;
    const html = await this.request.get(
      bookUrl,
    );
    const parser = HtmlParser.use(html);

    // Title
    const title = parser
      .title();

    // Tags, authors,..
    const metaFields = parser
      .select("div>div.attr-item")
      .all()
      .map((entry) => {
        const [l, r] = entry.asText().trim().replaceAll(/[\n\t\r ]+/g, " ")
          .split(
            ":",
          );
        return [l.trim(), r.trim()];
      });

    const tags: Array<Tag> = [];
    const metadatas: Array<Metadata> = [];
    const authors: Array<Author> = [];
    const seenAuthors = new Set<string>();
    for (const [key, value] of metaFields) {
      const values = value.split(/,\s*/).map((c) => c.trim());
      if (/author|artist/i.test(key)) {
        for (const name of values) {
          if (seenAuthors.has(name)) {
            continue;
          }
          seenAuthors.add(name);
          authors.push({ name, description: "" });
        }
      } else if (/genre|tag/i.test(key)) {
        tags.push(
          ...values.map((name) => <Tag> { name, metadatas: [] }),
        );
      } else {
        metadatas.push({
          label: key,
          content: value,
        });
      }
    }

    // Description
    const description =
      parser.select("#limit-height-body-summary").first()?.asText().trim() ??
        "";

    // Chapters
    const chapters = parser
      .select("a.visited.chapt")
      .all()
      .reverse() // !
      .map(async (item, index) => {
        const relUrl = item.attr("href")!;
        const text = item.asText()
          .replaceAll(
            / {1,}/g,
            " ",
          )
          .replaceAll(/[\n\t\r]+/g, " ")
          .trim();

        const [chapterUrl, pages] = await this.fetchPages(relUrl);
        const chapterCount = index + 1;
        return <Chapter> {
          title: text,
          description: text,
          number: chapterCount,
          pages,
          url: chapterUrl,
        };
      });

    return <Book> {
      title,
      title_aliases: [],
      source_id: bookId,
      url: bookUrl,
      authors,
      tags,
      description,
      chapters: await Promise.all(chapters),
      metadatas,
    };
  }

  private parseIdentifier(str: string) {
    const [, id] = str.match(/(\d+)\/?/) ?? [];
    if (id) {
      return id;
    }
    throw new Error(`Could not retrieve id from ${id}`);
  }

  override async search(_term: string, _option: SearchOption): Promise<Book[]> {
    return await Promise.resolve([]);
  }
}
