#!/usr/bin/env bash
# Push to GitHub without the local build step (no npm on this machine).
# Vercel will run the build on its side and surface any compile errors there.
# Usage:  bash push-nobuild.sh
set -euo pipefail

REPO="https://github.com/Robpattern/apac-product-metric-dashboard.git"
cd "$(dirname "$0")"

echo "==> Cleaning sandbox leftovers"
rm -rf node_modules package-lock.json .next

# Don't ship the helper scripts themselves
rm -f push.sh push-nobuild.sh.bak

echo "==> Committing"
if [ ! -d .git ]; then
  git init
  git branch -M main
fi
git add -A
git commit -m "APAC dashboard: overview, themes, metrics, projects, tickets + triage promote endpoint" \
  || echo "(nothing new to commit)"

echo "==> Pushing to $REPO"
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REPO"
else
  git remote set-url origin "$REPO"
fi

# The repo was created with a README, so reconcile that commit first.
git pull --rebase origin main 2>/dev/null || true
git push -u origin main

cat <<'DONE'

==> Pushed.

Next, in Vercel:
  1. Add New -> Project -> Import  apac-product-metric-dashboard
  2. Settings -> Environment Variables -> CLICKUP_API_TOKEN = <your ClickUp personal token>
     (ClickUp -> Settings -> Apps -> API Token). Optionally TRIAGE_SHARED_SECRET.
  3. Redeploy. Env vars are not applied to an existing build retroactively.
  4. Settings -> Deployment Protection -> Vercel Authentication. This page exposes
     internal project names, owners and metric targets, so don't leave it public.

Sanity check after deploy:
  /            dashboard
  /api/tickets JSON with count > 0; a 500 means the token is missing or wrong
  /api/promote GET returns the taxonomy contract for the triage tool

If the Vercel build fails, send me the log and I'll fix it.
DONE
