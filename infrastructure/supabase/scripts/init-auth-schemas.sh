#!/bin/bash
# ============================================================
# ReinPlaner — Initialize Auth Schemas (Gotrue Prerequisite)
# ============================================================
# Run this BEFORE starting the auth/Gotrue container for the first time.
# Creates required schemas on the Postgres database.
# ============================================================

set -e

echo "🔧 Creating Supabase internal schemas..."

psql_postgres() {
    docker exec -i reinplaner_postgres psql -U supabase_admin -d postgres "$@"
}

# Create all required schemas
echo "  → Creating auth schema..."
psql_postgres -c "CREATE SCHEMA IF NOT EXISTS auth;"

echo "  → Creating extensions schema..."
psql_postgres -c "CREATE SCHEMA IF NOT EXISTS extensions;"

echo "  → Creating storage schema..."
psql_postgres -c "CREATE SCHEMA IF NOT EXISTS storage;"

echo "  → Creating realtime schema..."
psql_postgres -c "CREATE SCHEMA IF NOT EXISTS realtime;"

echo "  → Creating extensions..."
psql_postgres -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\" SCHEMA extensions;"
psql_postgres -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\" SCHEMA extensions;"

echo ""
echo "✅ Auth schemas created successfully!"
echo ""
echo "You can now start the Supabase stack with:"
echo "  docker-compose -f infrastructure/docker-compose.prod.yml up -d"