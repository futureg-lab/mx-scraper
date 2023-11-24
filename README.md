# mx-scraper
mx-scraper (Manga eXtreme Scraper) is an opensource Manga website scraper<br/>

![alt text](misc/demo.gif)

## Usage examples
```bash
mx-scraper --help --verbose
mx-scraper -h -v
mx-scraper --infos
mx-scraper -i
mx-scraper --show-plugins -v
mx-scraper --search-plugin -v http://link/to/a/title
mx-scraper --auto --fetch http://link/to/a/title
mx-scraper --plugin plugin_name --fetch-all title1 title2 title3
mx-scraper --plugin nhentai --download --fetch-all 420166 420132
mx-scraper --auto --fetch-all --download --parallel http://link/to/title1 http://link/to/title2
mx-scraper --auto --download --parallel --fetch-file list.txt
mx-scraper --auto --download --parallel --fetch-file list.txt --meta-only
mx-scraper -a -d -pa -ff list.txt -mo
mx-scraper -a -d -pa -ff list.txt
mx-scraper -v -d --load-plan danbooru.yaml --plan-params TAG=bocchi_the_rock! "TITLE=Bocchi The Rock"
# using a custom query plan
# Examples can be found at src/plugins/plans
mx-scraper -v -d -mo --load-plan danbooru.yaml --plan-params TAG=bocchi_the_rock!
```

## Configuration
MXScraper will automatically create a `mx-scraper.config.json` file
```ts
interface MXConfiguration {
  VERSION: string;
  CLOUDFARE_PROXY_HOST: string,
  CLOUDFARE_MAX_TIMEOUT: number,
  LOAD_PLUGINS: Array<string>,
  BROWSER: {
    ENABLE: boolean,
    MODE: "HEADFULL" | "HEADLESS";
    EXEC_PATH: string,
  },
  PLUGIN_PROXY_ENABLE: Array<string>,
  DOWNLOAD_FOLDER: {
    DOWNLOAD: string,
    TEMP: string,
  },
  CACHE: {
    ENABLE: boolean,
    FOLDER: string,
  },
  MAX_SIZE_BATCH: number,
  LOGGER: {
    ENABLE: boolean,
  },
  SHOW_CLI_ERROR_STACK: boolean,
};
```

## Testing
```bash
npm test
```

## Building
```bash
node auto-build.js
```
