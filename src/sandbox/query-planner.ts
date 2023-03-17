import { QueryPlan } from "../core/QueryPlan";

const plan = QueryPlan.load("./sample.yaml").with({
    cli_param: "some_param"
});

const book = plan.run();