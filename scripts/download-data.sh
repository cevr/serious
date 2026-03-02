#!/usr/bin/env bash
set -euo pipefail

# Download language datasets for Serious SRS
# Frequency lists are committed to git; tatoeba + wiktextract are not (too large).

DATA_DIR="$(cd "$(dirname "$0")/../packages/core/data" && pwd)"

echo "Downloading to $DATA_DIR"

# ── Frequency lists (small, committed to git) ────────────────────────
FREQ_DIR="$DATA_DIR/frequency"
mkdir -p "$FREQ_DIR"

if [ ! -f "$FREQ_DIR/fr_50k.txt" ]; then
  echo "Downloading French frequency list..."
  curl -fSL -o "$FREQ_DIR/fr_50k.txt" \
    "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt"
  echo "  French: $(wc -l < "$FREQ_DIR/fr_50k.txt") words"
else
  echo "French frequency list already exists, skipping"
fi

if [ ! -f "$FREQ_DIR/es_50k.txt" ]; then
  echo "Downloading Spanish frequency list..."
  curl -fSL -o "$FREQ_DIR/es_50k.txt" \
    "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt"
  echo "  Spanish: $(wc -l < "$FREQ_DIR/es_50k.txt") words"
else
  echo "Spanish frequency list already exists, skipping"
fi

# ── Tatoeba sentence pairs ───────────────────────────────────────────
TAT_DIR="$DATA_DIR/tatoeba"
mkdir -p "$TAT_DIR"

if [ ! -f "$TAT_DIR/sentences.tar.bz2" ]; then
  echo "Downloading Tatoeba sentences (~208MB)..."
  curl -fSL -o "$TAT_DIR/sentences.tar.bz2" \
    "https://downloads.tatoeba.org/exports/sentences.tar.bz2"
  echo "  Sentences done: $(du -h "$TAT_DIR/sentences.tar.bz2" | cut -f1)"
else
  echo "Tatoeba sentences already exist, skipping"
fi

if [ ! -f "$TAT_DIR/links.tar.bz2" ]; then
  echo "Downloading Tatoeba links (~146MB)..."
  curl -fSL -o "$TAT_DIR/links.tar.bz2" \
    "https://downloads.tatoeba.org/exports/links.tar.bz2"
  echo "  Links done: $(du -h "$TAT_DIR/links.tar.bz2" | cut -f1)"
else
  echo "Tatoeba links already exist, skipping"
fi

# ── Wiktextract dictionary dumps ─────────────────────────────────────
WIKT_DIR="$DATA_DIR/wiktextract"
mkdir -p "$WIKT_DIR"

if [ ! -f "$WIKT_DIR/es-extract.jsonl.gz" ]; then
  echo "Downloading Wiktextract Spanish (~112MB)..."
  curl -fSL -o "$WIKT_DIR/es-extract.jsonl.gz" \
    "https://kaikki.org/dictionary/downloads/es/en-extract.jsonl.gz"
  echo "  ES done: $(du -h "$WIKT_DIR/es-extract.jsonl.gz" | cut -f1)"
else
  echo "Wiktextract Spanish already exists, skipping"
fi

if [ ! -f "$WIKT_DIR/fr-extract.jsonl.gz" ]; then
  echo "Downloading Wiktextract French (~660MB)..."
  curl -fSL -o "$WIKT_DIR/fr-extract.jsonl.gz" \
    "https://kaikki.org/dictionary/downloads/fr/en-extract.jsonl.gz"
  echo "  FR done: $(du -h "$WIKT_DIR/fr-extract.jsonl.gz" | cut -f1)"
else
  echo "Wiktextract French already exists, skipping"
fi

echo ""
echo "All downloads complete."
echo "Run 'tar -xjf tatoeba/sentences.tar.bz2 -C tatoeba/' to extract Tatoeba data."
