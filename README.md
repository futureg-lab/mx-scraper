# mx-scraper
mx-scraper (Manga Xtreme Scraper) is an opensource Manga website scraper<br/>

![alt text](misc/demo.gif)

## Build and Testing
### Testing
```
npm test
```

### Compile to javascript
```
npx tsc
```
### Build and Watch
```
npm start
```

# Packaging
You must change the target platform in your package.json depending on your host computer 
```
npm run build
```

# CLI examples
```
mx-scraper --help --verbose
mx-scraper -h -v
mx-scraper --show-plugins -v
mx-scraper --show-plugins -v -cs
mx-scraper --search-plugin -v http://link/to/a/title
npx ts-node ./src/cli.ts -help --verbose
npx ts-node ./src/cli.ts -sp
mx-scraper --auto --fetch http://link/to/a/title
mx-scraper --plugin plugin_name --fetch-all title1 title2 title3
mx-scraper --plugin plugin_name --fetch-all 420166 420132 --download --conf-session
mx-scraper --plugin nhentai --download --fetch-all 420166 420132
mx-scraper --auto --fetch-all --download --parallel http://link/to/title1 http://link/to/title2
mx-scraper --auto --download --parallel list.txt
mx-scraper --auto --download --parallel list.txt --meta-only
```