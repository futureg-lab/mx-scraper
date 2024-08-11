# mx-scraper

Download image galleries or metadata accross the web

> This is still a work in progress.
>
> This rewrite is expected to support previous implementations metadata format.
>
> The main idea was to separate the core (mx-scraper) from the plugins (user
> defined) as it was not possible from previous implementations.

# Usage

```bash
# the `images` plugin uses bs4
pip install beautifulsoup4
# This will for example download all images from this url using the `images` plugin.
mx-scraper fetch https://uncyclopedia.com/wiki/Main_Page --plugin images -v
```

## Commands

```bash
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

- [x] CLI
  - [x] Fetch a list of terms
  - [x] Fetch a list of files: parse, combine terms
  - [x] Generic URL Request
    - [x] Print as text
    - [x] Download `--dest` flag
  - [x] Authentications (Basic, Bearer token)

- [x] Cookies
  - [x] Loading from a file (Netscape format)
  - [x] Loading from the config (key-value)

- [x] Downloader
  - [x] Support of older mx-scraper book schema
  - [x] Download
  - [x] Cache support (can be disabled with `--no-cache` or from config)

- [ ] Plugins
  - [x] Python plugin
    - [x] `MxRequest` with runtime context (headers, cookies, auth)
  - [ ] Subprocess (e.g., gallery-dl, imgbrd-grabber)

- [ ] HtmlParser (optional feature)
  - [ ] Implement `HtmlParser.use(source).where('attr.href = ..')`
  - [ ] Wrap into a python class
