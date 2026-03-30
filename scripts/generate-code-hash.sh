#!/usr/bin/env bash
# Generate docs/.code-hash with per-folder SHA256 hashes for staleness tracking
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

HASH_FILE="docs/.code-hash"

find_src() {
  find "$1" \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/docs/*" \
    -not -path "*/archive/*" \
    -not -path "*/backups/*" \
    -not -path "*/.test-results/*" \
    -not -path "*/releases/*" \
    \( -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" \) \
    -type f 2>/dev/null | sort
}

hash_folder() {
  local folder="$1"
  local label="$2"
  if [ -d "$folder" ]; then
    local h
    h=$(find_src "$folder" | xargs sha256sum 2>/dev/null | sha256sum | cut -d' ' -f1)
    echo "  ${label}: ${h}"
  fi
}

hash_root() {
  local h
  h=$(find . -maxdepth 1 -type f \( -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" \) 2>/dev/null | sort | xargs sha256sum 2>/dev/null | sha256sum | cut -d' ' -f1)
  echo "  root: ${h}"
}

FILE_COUNT=$(find_src "." | wc -l | tr -d ' ')

mkdir -p docs
{
  echo "generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "folders:"
  hash_folder "server" "server/"
  hash_folder "extensions" "extensions/"
  hash_folder "rules" "rules/"
  hash_folder "specs" "specs/"
  hash_folder "scripts" "scripts/"
  hash_folder ".github" ".github/"
  hash_root
  echo "file_count: ${FILE_COUNT}"
} > "$HASH_FILE"

echo "Generated $HASH_FILE with $FILE_COUNT source files tracked"
