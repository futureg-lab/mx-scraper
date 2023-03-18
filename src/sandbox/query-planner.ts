import { QueryPlan } from "../core/QueryPlan";

const plan = QueryPlan.load("./src/plugins/plans/danbooru.yaml").with({
    TAG: "bocchi_the_rock%21+"
});

(async () => {
    const book = await plan.run((url: string, err) => {
    });

    console.log("Title", book.title);
    console.log("Total chapters", book.chapters.length);
    // book.chapters.forEach(ch => {
    //     console.log(ch.pages);
    // });
}) ();
