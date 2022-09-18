import { config } from "../environment";
import { batchAListOf } from "../utils/Utils";

const bsize = 2;
const batches = batchAListOf<number> ([1, 2, 3, 4, 5, 6, 7, 8, 9], bsize);

let i = 1;
for (let batch of batches) {
    console.log('Batch ', i++, ':', batch);
}