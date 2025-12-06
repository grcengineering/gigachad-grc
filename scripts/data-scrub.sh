#!/bin/bash
set -e

echo "🧹 GigaChad GRC - Complete Data Scrubbing"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will delete ALL data including:"
echo "   - All database records (controls, risks, audits, etc.)"
echo "   - All uploaded evidence files"
echo "   - All user accounts and sessions"
echo "   - All cached data"
echo ""
read -p "Are you sure you want to continue? (type 'YES' to confirm): " confirm

if [ "$confirm" != "YES" ]; then
    echo "❌ Data scrubbing cancelled"
    exit 0
fi

echo ""
echo "⏸️  Step 1/5: Stopping all services..."
docker-compose down

echo "🗑️  Step 2/5: Removing database data..."
docker volume rm gigachad-grc_postgres_data 2>/dev/null && echo "   ✓ PostgreSQL data removed" || echo "   ℹ️  No PostgreSQL data to remove"

echo "🗑️  Step 3/5: Removing cache data..."
docker volume rm gigachad-grc_redis_data 2>/dev/null && echo "   ✓ Redis data removed" || echo "   ℹ️  No Redis data to remove"

echo "🗑️  Step 4/5: Removing object storage..."
docker volume rm gigachad-grc_minio_data 2>/dev/null && echo "   ✓ MinIO data removed" || echo "   ℹ️  No MinIO data to remove"

echo "🗑️  Step 5/5: Removing local files..."
rm -rf ./storage 2>/dev/null && echo "   ✓ Local storage removed" || echo "   ℹ️  No local storage to remove"

echo ""
echo "✅ Data scrubbing complete!"
echo ""
echo "📝 Next steps to start fresh:"
echo "   1. Review and update credentials in .env file"
echo "   2. docker-compose up -d"
echo "   3. docker-compose exec postgres psql -U grc -d gigachad_grc -c 'SELECT NOW();'"
echo "   4. DATABASE_URL='postgresql://grc:grc_secret@localhost:5433/gigachad_grc' npm run prisma:push"
echo ""
