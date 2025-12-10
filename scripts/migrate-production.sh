#!/bin/bash
# Run this script to migrate your production database
# Make sure to set your production DATABASE_URL

echo "⚠️  WARNING: This will run migrations on your PRODUCTION database!"
echo "Make sure you have set the correct DATABASE_URL environment variable."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    npx prisma migrate deploy
    echo "✅ Migration complete!"
else
    echo "❌ Migration cancelled"
fi
