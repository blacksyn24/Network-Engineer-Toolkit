#!/usr/bin/env bash
# Ouvre Network Engineer Toolkit dans le navigateur par défaut (Linux / macOS).
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INDEX="$DIR/index.html"
if [[ ! -f "$INDEX" ]]; then
  echo "Fichier introuvable : $INDEX" >&2
  exit 1
fi
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$INDEX"
elif command -v open >/dev/null 2>&1; then
  open "$INDEX"
else
  echo "Installez xdg-open (Linux) ou utilisez open-netkit.bat sous Windows." >&2
  exit 1
fi
