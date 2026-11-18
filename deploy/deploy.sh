#!/usr/bin/env bash
# Run on the VPS from the repo folder: pulls latest code and restarts the stack.
set -euo pipefail
test -f .env || { echo "Create .env first: cp .env.example .env && nano .env"; exit 1; }
git pull --ff-only
docker compose up -d --build
docker compose ps
echo "Health:"; sleep 3; curl -fsS "https://$(grep ^DOMAIN= .env | cut -d= -f2)/healthz" && echo
