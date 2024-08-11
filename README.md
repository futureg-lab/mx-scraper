# mx-scraper

Download image galleries or metadata accross the web

> This is still a work in progress.
>
> This rewrite is expected to support previous implementations metadata format.
>
> The main idea was to separate the core (mx-scraper) from the plugins (user
> defined) as it was not possible from previous implementations.

## Commands

Basic overview

```
$ mx-scraper help

mx-scraper engine

Usage: mx-scraper <COMMAND>

Commands:
  fetch        Fetch a sequence of terms
  fetch-files  Fetch a sequence of files
  request      Request a url
  infos        Display various informations
  help         Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version
```

Each fetch strategy will share the same configuration..

# Features

- [ ] CLI
  - [x] Fetch a list of terms
  - [x] Fetch a list of files: parse, combine terms
  - [x] Generic URL Request
    - [x] Print as text
    - [ ] Download `--dest` flag

- [x] Cookies
  - [x] Loading from a file (Netscape format)
  - [x] Loading from the config (key-value)

- [ ] Downloader
  - [x] Support of older mx-scraper book schema
  - [ ] Download
  - [ ] Cache (books) support (can be disabled with `--no-cache` or from config)

- [ ] - Plugins
  - [x] Python plugin
    - [x] `MxRequest` with runtime context (headers, cookies, auth)
  - [ ] Subprocess (e.g., gallery-dl, imgbrd-grabber)

- [ ] HtmlParser (optional feature)
  - [ ] Implement `HtmlParser.use(source).where('attr.href = ..')`
  - [ ] Wrap into a python class
