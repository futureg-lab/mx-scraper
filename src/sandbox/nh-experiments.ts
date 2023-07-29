import { MXScraper } from "../core/MXScraper";
import { NHentai } from "../plugins/NHentai";

(async () => {
  try {
    const engine = new MXScraper();
    // init plugin
    const nhentai = <NHentai> engine.getPluginByIdentifier("NHentai");
    const book = await nhentai.fetchBook("177013");
    console.log(book);
    console.log(book.chapters[0]);

    // nhentai.destructor();
  } catch (err) {
    console.error(err);
  }
})();
