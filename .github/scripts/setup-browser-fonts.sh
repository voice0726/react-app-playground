#!/usr/bin/env bash
set -euo pipefail

apt-get purge -y fonts-wqy-zenhei
fc-cache -f
japanese_family=$(fc-match --format='%{family[0]}' 'sans-serif:lang=ja')
printf 'Japanese sans-serif: %s\n' "$japanese_family"
case "$japanese_family" in
  IPAGothic|IPAPGothic) ;;
  *) echo "Expected an IPA Japanese font, got: $japanese_family" >&2; exit 1 ;;
esac
