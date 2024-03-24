import { GraphQLHTTP } from "gql";
import { makeExecutableSchema } from "gql_schema";
import resolvers from "./resolvers.ts";
import typeDefs from "./schema.ts";
import { config } from "../../mx_configuration.ts";

const schema = makeExecutableSchema({ resolvers, typeDefs });

/**
Example:
```graphql
  query {
    navigate(url: "http://google.com") {
      title
      count
      select(
        selector: "a",
        where: "attr.href: %google% & attr.href: %accounts%"
      ) {
        first {
          text
          attr(name: "href")
        }
      }
    }
  }
```
 */
export default function spawnServer(): Deno.HttpServer {
  return Deno.serve({
    port: config.DEV.SERVER_PORT ?? 3000,
    onListen({ hostname, port }) {
      console.log(`☁ Started on http://${hostname}:${port}`);
      console.log(`☁ Playground on http://${hostname}:${port}/graphql`);
    },
  }, async (req) => {
    const { pathname } = new URL(req.url);
    return pathname === "/graphql"
      ? await GraphQLHTTP<Request>({
        schema,
        graphiql: true,
      })(req)
      : new Response("Not Found", { status: 404 });
  });
}
