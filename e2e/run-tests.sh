#!/bin/bash
# ============================================
# E2E Test Runner for ReinPlaner
# ============================================
#
# This script:
# 1. Seeds test data into Supabase
# 2. Starts the dev server
# 3. Runs E2E tests with Playwright
# 4. Generates test report
#
# Usage:
#   ./e2e/run-tests.sh
#   ./e2e/run-tests.sh --headed    # Show browser
#   ./e2e/run-tests.sh --ui        # Open Playwright UI
#   ./e2e/run-tests.sh --skip-seed # Skip seeding

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SKIP_SEED=false
HEADED=false
UI=false
PROJECT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADED=true
            shift
            ;;
        --ui)
            UI=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --project)
            PROJECT="--project=$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  ReinPlaner E2E Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check environment
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local not found!${NC}"
    echo -e "${YELLOW}Please copy .env.local.template to .env.local and configure it.${NC}"
    exit 1
fi

# Load environment
source .env.local 2>/dev/null || true

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Missing Supabase configuration in .env.local${NC}"
    echo "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Step 1: Seed test data
if [ "$SKIP_SEED" = false ]; then
    echo -e "${YELLOW}📦 Seeding test data...${NC}"
    npx tsx e2e/seed-test-data.ts
    echo ""
fi

# Step 2: Start dev server in background
echo -e "${YELLOW}🚀 Starting dev server...${NC}"
npm run dev > /tmp/reinplaner-dev.log 2>&1 &
DEV_PID=$!

# Wait for server to be ready
echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
MAX_WAIT=120
COUNTER=0
while [ $COUNTER -lt $MAX_WAIT ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is ready!${NC}"
        break
    fi
    sleep 2
    COUNTER=$((COUNTER + 2))
    echo -n "."
done

if [ $COUNTER -ge $MAX_WAIT ]; then
    echo -e "${RED}❌ Server failed to start within $MAX_WAIT seconds${NC}"
    echo -e "${YELLOW}Server log:${NC}"
    tail -20 /tmp/reinplaner-dev.log
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

echo ""

# Step 3: Run tests
echo -e "${YELLOW}🧪 Running E2E tests...${NC}"
echo ""

TEST_OPTS=""
if [ "$HEADED" = true ]; then
    TEST_OPTS="$TEST_OPTS --headed"
fi
if [ "$UI" = true ]; then
    TEST_OPTS="$TEST_OPTS --ui"
fi

# Set base URL
export BASE_URL=http://localhost:3000

# Run Playwright tests
npx playwright test \
    $PROJECT \
    $TEST_OPTS \
    --reporter=list \
    || true

# Cleanup
echo ""
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
kill $DEV_PID 2>/dev/null || true
echo -e "${GREEN}✅ Done!${NC}"