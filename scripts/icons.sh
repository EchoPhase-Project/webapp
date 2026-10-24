#!/usr/bin/env bash
# Renders the favicons from the SVG sources in src/static/assets/icons:
# icon.svg (the mark, also served as is), icon-small.svg (heavier strokes for
# 16 and 32 px), icon-apple.svg (full bleed for iOS). Needs rsvg-convert and
# ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/../src/static/assets/icons"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

rsvg-convert -w 16 -h 16 icon-small.svg -o favicon-16x16.png
rsvg-convert -w 32 -h 32 icon-small.svg -o favicon-32x32.png
rsvg-convert -w 48 -h 48 icon.svg -o "$tmp/48.png"
rsvg-convert -w 180 -h 180 icon-apple.svg -o apple-touch-icon.png
magick favicon-16x16.png favicon-32x32.png "$tmp/48.png" favicon.ico
