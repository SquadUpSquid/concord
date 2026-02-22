#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be semver format X.Y.Z (got '$VERSION')." >&2
  exit 1
fi

TAG="v$VERSION"

echo "Bumping project version to $VERSION"

node -e '
  const fs = require("fs");
  const version = process.argv[1];
  const pkgPath = "package.json";
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
' "$VERSION"

node -e '
  const fs = require("fs");
  const version = process.argv[1];
  const lockPath = "package-lock.json";
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.version = version;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = version;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
' "$VERSION"

node -e '
  const fs = require("fs");
  const version = process.argv[1];
  const confPath = "src-tauri/tauri.conf.json";
  const conf = JSON.parse(fs.readFileSync(confPath, "utf8"));
  conf.version = version;
  fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");
' "$VERSION"

sed -i -E '0,/^version = "[^"]+"/s//version = "'"$VERSION"'"/' src-tauri/Cargo.toml

TARGET_VERSION="$VERSION" perl -0777 -i -pe '
  my $version = $ENV{"TARGET_VERSION"};
  my $count = s/(\[\[package\]\]\nname = "concord"\nversion = ")[^"]+(")/$1.$version.$2/e;
  die "Failed to update concord package version in Cargo.lock\n" if $count == 0;
' src-tauri/Cargo.lock

bash .github/scripts/check-release-version.sh "$TAG"

echo "Version bump complete."
