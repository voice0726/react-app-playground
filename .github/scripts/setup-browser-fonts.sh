#!/usr/bin/env bash
set -euo pipefail

setup_started=$SECONDS
apt-get update
apt-get install -y --no-install-recommends fonts-noto-cjk
cat > /etc/fonts/conf.d/99-playground-japanese.conf <<'FONTCONFIG'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <match target="pattern">
    <test name="lang" compare="contains"><string>ja</string></test>
    <test name="family"><string>sans-serif</string></test>
    <edit name="family" mode="prepend" binding="strong">
      <string>Noto Sans CJK JP</string>
    </edit>
  </match>
</fontconfig>
FONTCONFIG
fc-cache -f
japanese_family=$(fc-match --format='%{family[0]}' 'sans-serif:lang=ja')
printf 'Japanese sans-serif: %s\n' "$japanese_family"
if [[ "$japanese_family" != 'Noto Sans CJK JP' ]]; then
  echo "Expected Noto Sans CJK JP, got: $japanese_family" >&2
  exit 1
fi
printf 'Font setup elapsed: %ss\n' "$((SECONDS - setup_started))"
