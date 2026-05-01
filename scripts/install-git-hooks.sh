#!/usr/bin/env bash
# Install repo-managed git hooks.
# Run once after clone: bash scripts/install-git-hooks.sh
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
SOURCE_DIR="$REPO_ROOT/scripts/git-hooks"

mkdir -p "$HOOKS_DIR"

for hook in pre-commit; do
  cp "$SOURCE_DIR/$hook" "$HOOKS_DIR/$hook"
  chmod +x "$HOOKS_DIR/$hook"
  echo "Installed $hook hook."
done

echo "Done. Hooks active for this clone."
echo "To bypass in emergency: git commit --no-verify"
