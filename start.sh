#!/usr/bin/env bash
# AI-GPU-Swapper (GPU Swap Vietnam) — one-command launcher
#
#   ./start.sh            production build + start on http://localhost:3410 (default)
#   ./start.sh --dev      development server with hot reload
#   ./start.sh --reset    wipe the database, re-migrate and re-seed demo data, then start
#   ./start.sh --stop     stop the app (by port) — the database container keeps running
#   ./start.sh --stop-all stop the app and the database container
#
set -euo pipefail
cd "$(dirname "$0")"

PORT=3410
MODE=prod
RESET=0
case "${1:-}" in
  --dev) MODE=dev ;;
  --reset) RESET=1 ;;
  --stop|--stop-all) MODE=stop ;;
  ""|--prod) ;;
  -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
  *) echo "Unknown option: $1 (try --help)"; exit 1 ;;
esac

log() { printf '\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }

stop_app() {
  # Stop whatever listens on our port only (never kill node processes by name).
  local pids
  pids=$(ss -ltnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | sort -u || true)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
    for _ in $(seq 1 10); do ss -ltn | grep -q ":$PORT " || break; sleep 1; done
    ok "Stopped app on port $PORT"
  fi
}

if [ "$MODE" = stop ]; then
  stop_app
  [ "${1:-}" = "--stop-all" ] && docker compose stop db && ok "Database stopped"
  exit 0
fi

# ── Prerequisites ──
command -v node >/dev/null || die "Node.js is required (v20+)"
command -v npm >/dev/null || die "npm is required"
command -v docker >/dev/null || die "Docker is required (for PostgreSQL)"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js 20+ required (found $(node -v))"

# ── .env ──
if [ ! -f .env ]; then
  log "Creating .env from .env.example (with a random SESSION_SECRET)"
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed "s/dev-only-change-me-dev-only-change-me-0000/$SECRET/" .env.example > .env
  ok ".env created — demo password is SEED_DEMO_PASSWORD in .env"
fi

# ── EC2: point APP_URL at the public IP (only while it still says localhost) ──
TOKEN=$(curl -fsS -m 2 -X PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' 2>/dev/null || true)
PUBLIC_IP=""
[ -n "$TOKEN" ] && PUBLIC_IP=$(curl -fsS -m 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
if [ -n "$PUBLIC_IP" ] && grep -q '^APP_URL="http://localhost' .env; then
  sed -i "s#^APP_URL=.*#APP_URL=\"http://$PUBLIC_IP:$PORT\"#" .env
  ok "EC2 detected — APP_URL set to http://$PUBLIC_IP:$PORT (edit .env for a domain/HTTPS)"
fi
set -a; . ./.env; set +a
BASE_URL=${APP_URL:-http://localhost:$PORT}

# ── Dependencies ──
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  log "Installing npm dependencies"
  npm install --no-audit --no-fund
fi

# ── Database ──
log "Starting PostgreSQL (docker compose, 127.0.0.1:55480)"
docker compose up -d db >/dev/null
for i in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' gpuswapper-db 2>/dev/null)" = "healthy" ] && break
  [ "$i" = 30 ] && die "Database did not become healthy"
  sleep 1
done
ok "Database ready"

if [ "$RESET" = 1 ]; then
  log "Resetting database and re-seeding demo data"
  npx prisma migrate reset --force
else
  log "Applying migrations"
  npx prisma migrate deploy >/tmp/gpuswapper-migrate.log 2>&1 || { cat /tmp/gpuswapper-migrate.log; die "Migration failed"; }
  npx prisma generate >/dev/null 2>&1
  log "Seeding (skipped automatically if demo data already exists)"
  npm run --silent db:seed
fi

# ── App ──
stop_app
if [ "$MODE" = dev ]; then
  log "Starting development server on http://localhost:$PORT"
  exec npx next dev -p "$PORT"
else
  log "Building production bundle (first run takes a minute)"
  NODE_OPTIONS="--max-old-space-size=3072" npx next build >/tmp/gpuswapper-build.log 2>&1 || { tail -30 /tmp/gpuswapper-build.log; die "Build failed (full log: /tmp/gpuswapper-build.log)"; }
  ok "Build complete"
  echo
  echo "  App:      $BASE_URL"
  echo "  Admin:    $BASE_URL/admin"
  echo "  Accounts: admin@ / reviewer@ / broker@ / broker2@ / seller@ / seller2@ / buyer@ example.com"
  echo "  Password: SEED_DEMO_PASSWORD from .env"
  echo "  Stop:     ./start.sh --stop   (Ctrl+C also stops the app)"
  echo
  exec npx next start -p "$PORT"
fi
