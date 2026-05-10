#!/usr/bin/env sh
set -eu

HOST="${VITASYNC_DEPLOY_HOST:-165.245.142.215}"
USER="${VITASYNC_DEPLOY_USER:-root}"
KEY="${VITASYNC_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_DIR="${VITASYNC_REMOTE_DIR:-/opt/vitasync}"
ENV_FILE="${VITASYNC_ENV_FILE:-.env.amd}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy .env.amd.example to $ENV_FILE and set strong production secrets first." >&2
  exit 1
fi

ssh -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$USER@$HOST" "mkdir -p '$REMOTE_DIR'"

rsync -az --delete \
  --exclude .git \
  --exclude node_modules \
  --exclude frontend/node_modules \
  --exclude frontend/dist \
  --exclude __pycache__ \
  --exclude '*.pyc' \
  --exclude .env \
  --exclude '.env.*' \
  --exclude .vitasync_ssh_key \
  -e "ssh -i $KEY -o StrictHostKeyChecking=accept-new" \
  ./ "$USER@$HOST:$REMOTE_DIR/"

scp -i "$KEY" -o StrictHostKeyChecking=accept-new "$ENV_FILE" "$USER@$HOST:$REMOTE_DIR/.env.amd"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$USER@$HOST" "
  set -eu
  cd '$REMOTE_DIR'
  sh deploy/amd-readiness.sh
  docker compose --env-file .env.amd -f docker-compose.amd.yml up -d --build
  docker compose --env-file .env.amd -f docker-compose.amd.yml ps
"
