#!/usr/bin/env bash
# UniApp Production Preflight Check
# Validates environment, service connectivity, and API health before deployment.
# Exit codes: 0 = all checks passed, 1 = one or more checks failed

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

PASS=0
FAIL=0

pass() {
  echo -e "  ${GREEN}✔${RESET}  $1"
  ((PASS++)) || true
}

fail() {
  echo -e "  ${RED}✘${RESET}  $1"
  ((FAIL++)) || true
}

warn() {
  echo -e "  ${YELLOW}!${RESET}  $1"
}

section() {
  echo ""
  echo -e "${CYAN}${BOLD}▶ $1${RESET}"
}

echo ""
echo -e "${BOLD}UniApp Production Preflight Check${RESET}"
echo -e "Running at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "────────────────────────────────────────────────"

# ─── 1. Required Environment Variables ───────────────────────────────────────
section "Required Environment Variables"

REQUIRED_VARS=(
  "DATABASE_URL"
  "ANTHROPIC_API_KEY"
  "JWT_SECRET"
  "REDIS_URL"
  "NATS_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    fail "${var} is not set"
  else
    pass "${var} is set"
  fi
done

# JWT secret strength
if [[ -n "${JWT_SECRET:-}" ]]; then
  if [[ ${#JWT_SECRET} -lt 32 ]]; then
    fail "JWT_SECRET must be at least 32 characters (currently ${#JWT_SECRET})"
  else
    pass "JWT_SECRET length is sufficient (${#JWT_SECRET} chars)"
  fi
fi

# Optional but recommended
OPTIONAL_VARS=("ALLOWED_ORIGINS" "LOG_LEVEL" "AI_MAX_BUDGET_USD")
section "Optional Environment Variables"
for var in "${OPTIONAL_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    warn "${var} is not set (using default)"
  else
    pass "${var} = ${!var}"
  fi
done

# ─── 2. Database Connectivity ─────────────────────────────────────────────────
section "Database (PostgreSQL)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  fail "DATABASE_URL not set — skipping DB check"
else
  # Extract host and port from DATABASE_URL
  # Pattern: postgres://user:pass@host:port/db
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|' || echo "5432")

  if command -v pg_isready &>/dev/null; then
    if pg_isready -d "$DATABASE_URL" -q 2>/dev/null; then
      pass "PostgreSQL is reachable at ${DB_HOST}:${DB_PORT}"
    else
      fail "PostgreSQL is NOT reachable at ${DB_HOST}:${DB_PORT}"
    fi
  elif command -v psql &>/dev/null; then
    if psql "$DATABASE_URL" -c "SELECT 1" -q -A -t 2>/dev/null | grep -q "1"; then
      pass "PostgreSQL query succeeded at ${DB_HOST}:${DB_PORT}"
    else
      fail "PostgreSQL is NOT reachable at ${DB_HOST}:${DB_PORT}"
    fi
  else
    # Fallback: TCP check
    if timeout 5 bash -c "cat < /dev/null > /dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; then
      pass "PostgreSQL TCP port open at ${DB_HOST}:${DB_PORT}"
    else
      fail "PostgreSQL TCP port closed at ${DB_HOST}:${DB_PORT}"
    fi
  fi
fi

# ─── 3. Redis Connectivity ────────────────────────────────────────────────────
section "Cache (Redis)"

if [[ -z "${REDIS_URL:-}" ]]; then
  fail "REDIS_URL not set — skipping Redis check"
else
  REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's|.*@([^:/]+).*|\1|; s|redis://([^:/]+).*|\1|')
  REDIS_PORT=$(echo "$REDIS_URL" | sed -E 's|.*:([0-9]+)/?$|\1|' || echo "6379")
  REDIS_PORT=${REDIS_PORT:-6379}

  if command -v redis-cli &>/dev/null; then
    # Strip credentials from URL for redis-cli
    REDIS_NO_CREDS=$(echo "$REDIS_URL" | sed -E 's|redis://[^@]*@|redis://|')
    if redis-cli -u "$REDIS_URL" ping 2>/dev/null | grep -qi "pong"; then
      pass "Redis is reachable and responding to PING"
    else
      fail "Redis is NOT reachable or not responding to PING"
    fi
  else
    if timeout 5 bash -c "cat < /dev/null > /dev/tcp/${REDIS_HOST}/${REDIS_PORT}" 2>/dev/null; then
      pass "Redis TCP port open at ${REDIS_HOST}:${REDIS_PORT}"
    else
      fail "Redis TCP port closed at ${REDIS_HOST}:${REDIS_PORT}"
    fi
  fi
fi

# ─── 4. NATS Connectivity ─────────────────────────────────────────────────────
section "Event Bus (NATS)"

if [[ -z "${NATS_URL:-}" ]]; then
  fail "NATS_URL not set — skipping NATS check"
else
  NATS_HOST=$(echo "$NATS_URL" | sed -E 's|nats://([^:/]+).*|\1|')
  NATS_PORT=$(echo "$NATS_URL" | sed -E 's|.*:([0-9]+)/?$|\1|' || echo "4222")
  NATS_PORT=${NATS_PORT:-4222}
  NATS_MON_PORT=${NATS_MONITOR_PORT:-8222}

  # Try HTTP monitoring endpoint first
  if command -v curl &>/dev/null; then
    if curl -sf "http://${NATS_HOST}:${NATS_MON_PORT}/healthz" -o /dev/null 2>/dev/null; then
      pass "NATS health endpoint is reachable at ${NATS_HOST}:${NATS_MON_PORT}/healthz"
    elif timeout 5 bash -c "cat < /dev/null > /dev/tcp/${NATS_HOST}/${NATS_PORT}" 2>/dev/null; then
      pass "NATS TCP port open at ${NATS_HOST}:${NATS_PORT} (HTTP monitor not available)"
    else
      fail "NATS is NOT reachable at ${NATS_HOST}:${NATS_PORT}"
    fi
  else
    if timeout 5 bash -c "cat < /dev/null > /dev/tcp/${NATS_HOST}/${NATS_PORT}" 2>/dev/null; then
      pass "NATS TCP port open at ${NATS_HOST}:${NATS_PORT}"
    else
      fail "NATS TCP port closed at ${NATS_HOST}:${NATS_PORT}"
    fi
  fi
fi

# ─── 5. API Health Endpoint ───────────────────────────────────────────────────
section "API Health Check"

API_URL=${API_HEALTH_URL:-http://localhost:3001/health}

if command -v curl &>/dev/null; then
  HTTP_STATUS=$(curl -sf -o /tmp/uniapp_health.json -w "%{http_code}" "$API_URL" 2>/dev/null || echo "000")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "API health endpoint returned 200 OK (${API_URL})"
    if command -v jq &>/dev/null && [[ -f /tmp/uniapp_health.json ]]; then
      STATUS_VALUE=$(jq -r '.status // empty' /tmp/uniapp_health.json 2>/dev/null || true)
      if [[ "$STATUS_VALUE" == "ok" ]]; then
        pass "API status field is \"ok\""
      else
        warn "API status field is \"${STATUS_VALUE:-unknown}\" (expected \"ok\")"
      fi
    fi
    rm -f /tmp/uniapp_health.json
  elif [[ "$HTTP_STATUS" == "000" ]]; then
    fail "API is NOT reachable at ${API_URL} (connection refused or timeout)"
  else
    fail "API health endpoint returned HTTP ${HTTP_STATUS} (expected 200)"
  fi
elif command -v wget &>/dev/null; then
  if wget -q --spider "$API_URL" 2>/dev/null; then
    pass "API health endpoint is reachable (${API_URL})"
  else
    fail "API is NOT reachable at ${API_URL}"
  fi
else
  warn "Neither curl nor wget available — skipping API health check"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────────"
TOTAL=$((PASS + FAIL))
echo -e "${BOLD}Results: ${GREEN}${PASS} passed${RESET}, ${RED}${FAIL} failed${RESET} (${TOTAL} total)"

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}${BOLD}Preflight FAILED — do not deploy until all checks pass.${RESET}"
  echo ""
  exit 1
else
  echo -e "${GREEN}${BOLD}Preflight PASSED — safe to deploy.${RESET}"
  echo ""
  exit 0
fi
