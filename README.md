# Personal site — gennaroalberto.github.io

A simple Jekyll site. All content lives in `_data/resume.yml`; templates are in `_includes/` and `_layouts/`.

## Run it locally

The fastest path (Jekyll with live reload):

```bash
bundle install            # one-time
bundle exec jekyll serve --livereload
# open http://127.0.0.1:4000
```

A convenience script is included:

```bash
./serve.sh                # bundle exec jekyll serve --livereload
./serve.sh build          # one-shot build into _site/
./serve.sh static         # serve the prebuilt _site/ with Python (no Ruby needed)
```

If you don't have Ruby installed, install it once with [rbenv](https://github.com/rbenv/rbenv) or Homebrew (`brew install ruby`), then `gem install bundler`.

### No-Ruby fallback

Already have a `_site/` directory (e.g. from CI)? Just:

```bash
cd _site
python3 -m http.server 4000
```

## Editing content

Almost everything you'd want to change lives in `_data/resume.yml`:

- `kicker` / `blurb` — top of the page
- `chips` — keyword tags
- `links` — social/professional links (Scholar, GitHub, LinkedIn…)
- `news` — items shown on the home page
- `publications` — feeds both the home preview and the dedicated Publications page
- `research_projects` — long-form projects on the Research page
- `experience`, `education`, `teaching`, `talks`, `awards` — Research page

After editing, refresh the browser (Jekyll watches for changes when run via `--livereload`).

## Structure

```
_config.yml             site title/description
_data/resume.yml        all content
_includes/              partials (nav, hero, contact, icons)
_layouts/default.html   shared HTML shell (theme toggle, SEO, fonts)
assets/css/main.css     styles (light + dark mode)
index.md                Home
research.md             Research
publications.md         Publications
```
