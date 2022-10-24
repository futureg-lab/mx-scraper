# mx-scraper
mx-scraper (Manga Xtreme Scraper) is an opensource Manga website scraper<br/>

![alt text](misc/demo.gif)

## CLI examples
```
mx-scraper --help --verbose
mx-scraper -h -v
mx-scraper --infos
mx-scraper -i
mx-scraper --show-plugins -v
mx-scraper --show-plugins -v -cs
mx-scraper --search-plugin -v http://link/to/a/title
mx-scraper --auto --fetch http://link/to/a/title
mx-scraper --plugin plugin_name --fetch-all title1 title2 title3
mx-scraper --plugin plugin_name --fetch-all 420166 420132 --download --conf-session
mx-scraper --plugin nhentai --download --fetch-all 420166 420132
mx-scraper --auto --fetch-all --download --parallel http://link/to/title1 http://link/to/title2
mx-scraper --auto --download --parallel --fetch-file list.txt
mx-scraper --auto --download --parallel --fetch-file list.txt --meta-only
mx-scraper -a -d -pa -ff list.txt -mo
mx-scraper -a -d -pa -ff list.txt
```

## Configuring
MXScraper will automatically create a `mx-scraper.config.json` file
```json
{
  "CLOUDFARE_PROXY_HOST": "http://localhost:8191/v1",
  "CLOUDFARE_MAX_TIMEOUT": 120000,
  "LOAD_PLUGINS": [
    "Plugin1",
    "Plugin2",
    "...."
  ],
  "PLUGIN_PROXY_ENABLE": [
    "Plugin1",
    "Plugin9",
    "..."
  ],
  "HEADLESS": {
    "ENGINE": "PUPPETEER",
    "ENABLE": true,
    "EXEC_PATH": "./browser/chrome"
  },
  "UNIQUE_SESSION": "<flaresolverr_sessionid>",
  "DOWNLOAD_FOLDER": {
    "DOWNLOAD": "./download/download",
    "TEMP": "./download/temp"
  },
  "CACHE": {
    "ENABLE": true,
    "FOLDER": "./query_cache"
  },
  "LOGGER": {
    "ENABLE": true
  },
  "SHOW_CLI_ERROR_STACK": true
}
```

## Building and Testing
### Testing
```
npm test
```

### Compile to javascript
```
npx tsc
```
### Compile to javascript and Watch
```
npm start
```

# Packaging
You must specify the target platform in your package.json depending on your host computer 
```
node auto-build.js
```
