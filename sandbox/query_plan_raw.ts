import { QueryPlan } from "../src/core/query_plan.ts";

const plan = QueryPlan.load("./examples/plans/danbooru.yaml").with({
  TAG: "bocchi_the_rock%21+",
});

(async () => {
  const book = await plan.run((url: string, err) => {
    if (err) {
      console.error(err);
    }
    console.log(url);
  });

  console.log("Title", book.title);
  console.log("Total chapters", book.chapters.length);
  console.log("Total chapters", book.chapters);
  // book.chapters.forEach(ch => {
  //     console.log(ch.pages);
  // });
})();
