#!/usr/bin/env bash
# Creates or updates one comment on the pull request, found by a hidden marker,
# so a later run edits the comment instead of adding another.
#
#   pr-comment.sh <marker> <body-file>
#
# Needs GH_TOKEN, GITHUB_REPOSITORY and PR in the environment.
set -euo pipefail

marker="<!-- $1 -->"
body="$marker
$(cat "$2")"

# sed rather than head, so gh can finish writing every page under pipefail.
id=$(gh api --paginate "repos/$GITHUB_REPOSITORY/issues/$PR/comments" \
  --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | startswith(\"$marker\"))) | .id" |
  sed -n 1p)

if [ -n "$id" ]; then
  gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$id" \
    -f body="$body" >/dev/null
else
  gh api -X POST "repos/$GITHUB_REPOSITORY/issues/$PR/comments" \
    -f body="$body" >/dev/null
fi
