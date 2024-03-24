import { gql } from "graphql_tag";
export default gql`
  type NodeResult {
    href: String
    src: String
    html: String
    text: String
    attr(name: String!): String
  }

  type QueryResult {
    all: [NodeResult]
    first: NodeResult
    last: NodeResult
    nth(position: Int!): NodeResult
  }

  type ParserResult {
    title: String!
    count: Int!
    select(selector: String!, where: String): QueryResult
    request: String!
  }

  type Query {
    navigate(url: String!, render: String): ParserResult
  }
`;
