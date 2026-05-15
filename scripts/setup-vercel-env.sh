#!/usr/bin/env bash
# Push every KEY=VALUE in .env.local up to the linked Vercel project,
# for production / preview / development scopes. Idempotent — overwrites
# existing values via `--force`.
#
# Prereqs (one-time, from this directory):
#   npm i -g vercel
#   vercel login
#   vercel link            # link this folder to your Vercel project
#
# Usage:
#   bash scripts/setup-vercel-env.sh
#
# After it finishes:
#   vercel --prod          # trigger a fresh deploy that picks up the new vars
set -euo pipefail

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "❌ .env.local not found. Create it first (see .env.example)."
  exit 1
fi

push() {
  local name="$1"
  local value="$2"
  for scope in production preview development; do
    # Remove any existing value first so we can re-add without prompts.
    vercel env rm "$name" "$scope" --yes >/dev/null 2>&1 || true
    printf "%s" "$value" | vercel env add "$name" "$scope" >/dev/null
  done
  echo "  ✓ $name"
}

echo "Pushing env vars to Vercel…"
while IFS='=' read -r key rest; do
  # Skip blank lines and comments.
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
  # Trim whitespace on the key.
  key="$(echo "$key" | xargs)"
  # Strip surrounding quotes from the value.
  value="$rest"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  push "$key" "$value"
done < .env.local

echo
echo "Done. Trigger a fresh deploy so the running app picks up the new values:"
echo "   vercel --prod"
echo "(or push any commit to main)"
