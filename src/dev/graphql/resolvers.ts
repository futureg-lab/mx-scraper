import { CustomRequest } from "../../utils/custom_request.ts";
import { HtmlNode, HtmlParser } from "../../utils/html_parser.ts";

export default {
  Query: {
    async navigate(_: any, { url, render }: any, req: any) {
      const request = new CustomRequest();
      if (render) {
        request.enableRendering();
        request.enableReUsingBrowserInstance();
      }

      const html = await request.get(url);
      const parser = HtmlParser.use(html);

      const nodeResolver = (node: HtmlNode | null) => ({
        html: () => node?.asHtml(),
        text: () => node?.asText(),
        href: () => node?.attr("href"),
        src: () => node?.attr("src"),
        attr: ({ name }: any) => node?.attr(name),
      });

      return { // ParserResult
        title: () => parser.title(),
        count: () => html.length,
        select({ selector, where }: any) {
          let selected = parser.select(selector);
          if (where) {
            selected = selected.where(where);
          }
          return { // QueryResult
            all: () => selected.all().map((node) => nodeResolver(node)),
            first: () => nodeResolver(selected.first()),
            last: () => nodeResolver(selected.last()),
            nth: ({ position }: any) => nodeResolver(selected.nth(position)),
          };
        },
        request: () => JSON.stringify(req),
      };
    },
  },
};
