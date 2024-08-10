# mx-scraper

Download image galleries or metadata accross the web

> This is still a work in progress.
> This rewrite is expected to support previous implementations metadata format.
> The main idea was to separate the core (mx-scraper) from the plugins (user defined) as it was not possible from previous implementations.

## Commands

Basic overview

```
$ mx-scraper help

mx-scraper engine

Usage: mx-scraper <COMMAND>

Commands:
  fetch        Fetch a sequence of terms
  fetch-files  Fetch a sequence of files
  infos        Display various informations
  help         Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version
```

Each fetch strategy share the same configurations

```
$ mx-scraper help fetch

Usage: mx-scraper fetch [OPTIONS] <TERMS>...

Arguments:
  <TERMS>...  A sequence of terms

Options:
  -m, --meta-only                Only fetch metadata
  -v, --verbose                  Verbose mode
  -n, --no-cache                 Disable cache
  -p, --plugin <PLUGIN>          Specifically use a plugin and bypass checks
  -c, --cookies <COOKIES>        Load cookies from a file
      --user <USER>              Username
      --password <PASSWORD>      Password
      --basic-auth <BASIC_AUTH>  Basic auth
  -h, --help                     Print help
```
