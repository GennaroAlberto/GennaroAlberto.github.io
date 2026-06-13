#!/usr/bin/env bash
# Local preview helper for the personal site.
# Usage:
#   ./serve.sh            -> bundle exec jekyll serve --livereload (preferred)
#   ./serve.sh static     -> serve the already-built _site/ with Python (no Ruby needed)
#   ./serve.sh build      -> one-shot build into _site/

set -e
cd "$(dirname "$0")"

# --- Optional: resize a very large portrait once for faster page loads ---
# Generates assets/img/portrait@1400.jpg (high-res, max 1400px) only if the
# source has changed and macOS `sips` is available. The site still references
# the original portrait.jpeg by default.
SRC="assets/img/portrait.jpeg"
DST="assets/img/portrait@1400.jpg"
if command -v sips >/dev/null 2>&1 && [ -f "$SRC" ] && { [ ! -f "$DST" ] || [ "$SRC" -nt "$DST" ]; }; then
  if [ "$(wc -c < "$SRC")" -gt 1000000 ]; then
    echo "→ resizing $SRC → $DST (max 1400px, q=86)"
    sips -s format jpeg -s formatOptions 86 -Z 1400 "$SRC" --out "$DST" >/dev/null
  fi
fi

MODE="${1:-jekyll}"

case "$MODE" in
  jekyll)
    if ! command -v bundle >/dev/null 2>&1; then
      echo "Bundler not found. Install Ruby + bundler, or run: ./serve.sh static"
      exit 1
    fi
    # First run: install gems
    if [ ! -d "vendor/bundle" ] && [ -z "$(bundle config path 2>/dev/null | grep -v 'You have not')" ]; then
      bundle install --path vendor/bundle
    fi
    echo "→ http://127.0.0.1:4000"
    bundle exec jekyll serve --livereload --host 127.0.0.1 --port 4000
    ;;

  build)
    bundle exec jekyll build
    echo "Built into _site/"
    ;;

  static)
    if [ ! -d "_site" ]; then
      echo "_site/ not found. Run a build first (./serve.sh build) or use ./serve.sh jekyll."
      exit 1
    fi
    cd _site
    echo "→ http://127.0.0.1:4000 (serving _site/ — no live reload)"
    python3 -m http.server 4000
    ;;

  *)
    echo "Unknown mode: $MODE"
    echo "Use: ./serve.sh [jekyll|build|static]"
    exit 2
    ;;
esac
