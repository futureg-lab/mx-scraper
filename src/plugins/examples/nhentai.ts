import { CheerioAPI, load } from "cheerio";
import {
  Author,
  Book,
  Chapter,
  Metadata,
  Page,
  SearchOption,
  Tag,
  TitleAlias,
} from "../../core/book.ts";
import { MXPlugin } from "../../core/mx_plugin.ts";
import { CustomRequest } from "../../utils/custom_request.ts";
import { decodeUnicodeCharacters } from "../../utils/utils.ts";
import { MXLogger } from "../../cli/mx_logger.ts";

export default class NHentai extends MXPlugin {
  title: string = "NHentai";
  version: string = "1.1.0";
  targetUrl: string = "https://nhentai.net/";
  request: CustomRequest;

  private galleryUrl: string = "https://i3.nhentai.net/galleries/";
  private apiUrl: string = "https://nhentai.net/api/gallery/";

  constructor() {
    super();
    this.request = new CustomRequest();
  }

  override async fetchBook(doujinIdOrUrl: string): Promise<Book> {
    const doujinId = this.extractDoujinIdFromPotentialUrl(doujinIdOrUrl);
    const url = this.targetUrl + "g/" + doujinId;

    // Fetch the json object
    MXLogger.infoRefresh("[NHentai] Fetching book " + doujinId);
    let json = null;
    try {
      json = await this.fetchJsonUsingAPI(doujinId);
    } catch (_) {
      json = await this.fetchJsonOnDoujinPage(doujinId);
    }

    // titles
    const titles: TitleAlias[] = [];
    for (const lang in json.title) {
      if (!json.title[lang] || json.title[lang] == "") continue;
      titles.push(
        <TitleAlias> {
          title: decodeUnicodeCharacters(json.title[lang]),
          description: lang,
        },
      );
    }
    const currTitle = decodeUnicodeCharacters(
      json.title["english"] || titles[0],
    );

    // author ?
    const authors: Author[] = json
      .tags
      .filter((tag: any) => ["artist", "group"].includes(tag.type))
      .map((tag: any) =>
        <Author> {
          name: decodeUnicodeCharacters(tag.name),
          description: "",
        }
      );

    // tags ?
    const tags: Tag[] = json["tags"].map((tag: any) =>
      <Tag> {
        name: tag.name,
        metadatas: Object.keys(tag).map((key) =>
          <Metadata> {
            label: key,
            content: tag[key],
          }
        ),
      }
    );

    // book setup
    const book: Book = <Book> {
      url: url,
      title: currTitle,
      title_aliases: titles,
      source_id: doujinId,
      authors: authors,
      chapters: [],
      description: "",
      tags: tags,
      metadatas: [
        <Metadata> {
          label: "json",
          content: json,
        },
      ],
    };

    // chapter
    const chapter = this.constructChapterFrom(book, json);
    book.chapters.push(chapter);

    return book;
  }

  private constructChapterFrom(book: Book, json: any) {
    const chapter = <Chapter> {
      title: book.title,
      number: 1,
      pages: [],
      description: "",
      url: book.url,
    };

    const typeMap = {
      "p": "png",
      "j": "jpg",
      "g": "gif",
    };
    const trivialCases = Object.values(typeMap);

    // pages
    for (let i = 0; i < json.images.pages.length; i++) {
      const pageNumber = 1 + i;
      const metaImage = json.images.pages[i];
      const metaType = metaImage["t"] as keyof typeof typeMap;
      const filenameChunk = [
        pageNumber,
        trivialCases.includes(metaType) ? metaType : (typeMap[metaType] || ""),
      ];
      const filename = filenameChunk.join(".");
      chapter.pages.push(
        <Page> {
          title: "" + pageNumber,
          number: pageNumber,
          filename: filename,
          url: this.galleryUrl + json.media_id + "/" + filename,
        },
      );
    }

    return chapter;
  }

  private async fetchJsonUsingAPI(doujinId: string) {
    const url = this.apiUrl + doujinId;
    const responseHtml = await this.request.get(url);
    const $: CheerioAPI = load(responseHtml);
    // fetch the json object
    const body = $("body").text();

    return JSON.parse(body.replace(/\\u0022/g, '"'));
  }

  private async fetchJsonOnDoujinPage(doujinId: string) {
    const url = this.targetUrl + "g/" + doujinId;
    const responseHtml = await this.request.get(url);
    const $: CheerioAPI = load(responseHtml);

    // fetch the json object
    let json = null;
    $("script").each((_i, element) => {
      const text = $(element).text();
      if (/JSON\.parse/.test(text)) {
        const [, temp] = text.match(/JSON\.parse\("(.+?)"\)/i)!;
        json = JSON.parse(temp.replace(/\\u0022/g, '"'));
        return;
      }
    });

    return json;
  }

  private extractDoujinIdFromPotentialUrl(str: string) {
    const [code] = str.match(/([0-9]+)/)!;
    return code;
  }

  override async search(_term: string, _option: SearchOption): Promise<Book[]> {
    return await Promise.resolve([]);
  }
}
