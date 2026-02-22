#!/usr/bin/env bash
set -euo pipefail

TAG="${GITHUB_REF_NAME:-${1:-}}"
if [[ -z "$TAG" ]]; then
  echo "Error: tag is required (arg1 or GITHUB_REF_NAME)." >&2
  exit 1
fi
if [[ "$TAG" != v* ]]; then
  echo "Error: expected tag starting with 'v', got '$TAG'." >&2
  exit 1
fi
EXPECTED_VERSION="${TAG#v}"

echo "Checking release versions against tag: $TAG (expected version: $EXPECTED_VERSION)"

PACKAGE_VERSION=$(node -p "require('./package.json').version")
PACKAGE_LOCK_ROOT_VERSION=$(node -p "require('./package-lock.json').version")
PACKAGE_LOCK_PROJECT_VERSION=$(node -p "require('./package-lock.json').packages[''].version")
TAURI_CONF_VERSION=$(node -p "require('./src-tauri/tauri.conf.json').version")

CARGO_TOML_VERSION=$(awk -F'"' '/^version = "/ { print $2; exit }' src-tauri/Cargo.toml)

CARGO_LOCK_CONCORD_VERSION=$(awk '
  /^\[\[package\]\]$/ { in_pkg=1; name=""; version=""; next }
  in_pkg && /^name = / {
    n=$0; sub(/^name = "/, "", n); sub(/"$/, "", n); name=n; next
  }
  in_pkg && /^version = / {
    v=$0; sub(/^version = "/, "", v); sub(/"$/, "", v); version=v;
    if (name == "concord") { print version; exit }
  }
' src-tauri/Cargo.lock)

if [[ -z "$CARGO_LOCK_CONCORD_VERSION" ]]; then
  echo "Error: could not find concord package version in src-tauri/Cargo.lock" >&2
  exit 1
fi

mismatch=0
check_one() {
  local file="$1"
  local value="$2"
  if [[ "$value" != "$EXPECTED_VERSION" ]]; then
    echo "Mismatch: $file = $value (expected $EXPECTED_VERSION)"
    mismatch=1
  else
    echo "OK: $file = $value"
  fi
}

check_one "package.json" "$PACKAGE_VERSION"
check_one "package-lock.json (root)" "$PACKAGE_LOCK_ROOT_VERSION"
check_one "package-lock.json (packages[''])" "$PACKAGE_LOCK_PROJECT_VERSION"
check_one "src-tauri/tauri.conf.json" "$TAURI_CONF_VERSION"
check_one "src-tauri/Cargo.toml" "$CARGO_TOML_VERSION"
check_one "src-tauri/Cargo.lock (concord package)" "$CARGO_LOCK_CONCORD_VERSION"

if [[ "$mismatch" -ne 0 ]]; then
  echo ""
  echo "Release version check failed. Update the files above to match tag $TAG."
  exit 1
fi

echo "Release version check passed."
