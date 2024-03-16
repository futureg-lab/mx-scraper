# mx-scraper

> Notice: This project has been migrated to deno starting from v4.0.0 due to
> [pkg](https://github.com/vercel/pkg) being deprecated.

## Usage

> The Flaresolverr proxy feature requires
> [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr)

> For the headless/headfull browser feature, you may want to install the appropriate
> chrome or firefox version [here](https://deno.land/x/puppeteer@16.2.0), if a
> browser is already available locally, you can set it on the configuration
> file.

```bash
mx-scraper --help --verbose
mx-scraper --infos
mx-scraper -h -v
mx-scraper --show-plugins -v
mx-scraper --show-plugins -v -cs
mx-scraper --search-plugin -v http://link/to/a/title
mx-scraper --auto --fetch http://link/to/a/title
mx-scraper --plugin <PLUGIN_NAME> --fetch-all title1 title2 title3
mx-scraper --auto --fetch-all --download --parallel http://link/to/title1 http://link/to/title2
mx-scraper --auto --download --parallel --fetch-file list.txt
mx-scraper --auto --download --parallel --fetch-file list.txt --meta-only
mx-scraper -a -d -pa -ff list.txt -mo
mx-scraper -a -d -pa -ff list.txt
mx-scraper -v -d --load-plan danbooru.yaml --plan-params TAG=bocchi_the_rock! "TITLE=Bocchi The Rock"
```

## Development

1. Download
   [deno](https://docs.deno.com/runtime/manual/getting_started/installation)
2. Install [puppeteer](https://deno.land/x/puppeteer@16.2.0)
3. Install [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr) or
   update the configuration file if an instance is available on your network
4. Run the following commands to make sure everything is working

```bash
# Cache dependencies
deno cache --config=./src/config.json --lock-write ./src/main.ts
# Testing (some tests require Flaresolverr)
deno test -A --config=./src/config.json ./tests
# Running (dev)
deno run -A --config=./src/config.json ./src/main.ts --infos
# Compiling
# deno compile -A --output mx-scraper --config=./src/config.json ./src/main.ts --is_compiled_binary
```
