# Database Setup Guide

## Overview
This guide will help you set up the database tables for the advanced features in HealthConnect.

## Prerequisites
- Supabase project created
- Access to Supabase SQL Editor
- Admin access to your Supabase project

## Migration Files

We have created 2 SQL migration files:

1. **001_advanced_features.sql** - Creates all tables and indexes
2. **002_rls_policies.sql** - Sets up Row Level Security policies

## Step-by-Step Instructions

### 1. Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### 2. Run Main Migration

1. Open `supabase/migrations/001_advanced_features.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" or press `Ctrl+Enter`
5. Verify success message appears

**This migration creates:**
- ✅ Badges table with predefined badges
- ✅ User badges (junction table)
- ✅ Achievements tracking
- ✅ User streaks
- ✅ Analytics events
- ✅ IoT devices
- ✅ Vital signs
- ✅ Health metrics
- ✅ Device alerts
- ✅ All necessary indexes

### 3. Run RLS Policies Migration

1. Open `supabase/migrations/002_rls_policies.sql`
2. Copy the entire contents
3. Paste into a new query in Supabase SQL Editor
4. Click "Run" or press `Ctrl+Enter`
5. Verify success message appears

**This migration sets up:**
- ✅ Row Level Security on all tables
- ✅ User-specific data access policies
- ✅ Admin access policies
- ✅ Healthcare provider access to patient data
- ✅ Automatic streak tracking triggers

### 4. Verify Tables Created

In Supabase:
1. Go to "Table Editor"
2. You should see these new tables:
   - `badges`
   - `user_badges`
   - `achievements`
   - `user_streaks`
   - `user_events`
   - `iot_devices`
   - `vital_signs`
   - `health_metrics`
   - `device_alerts`

### 5. Check Seed Data

1. Go to "Table Editor"
2. Click on `badges` table
3. You should see 10 predefined badges

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

**User Data:**
- Users can only view/edit their own data
- Healthcare providers can view patient vital signs
- Admins have full access to analytics

**Badges:**
- Everyone can view badges
- Only admins can create new badges
- Users can earn badges (insert into user_badges)

**IoT Devices:**
- Users fully manage their own devices
- Device alerts are visible to device owners

## Automatic Features

### Streak Tracking

The database automatically tracks user health streaks:
- Increments streak when user logs data daily
- Resets to 1 if a day is missed
- Tracks longest streak achieved
- Triggers on both health_metrics and vital_signs inserts

## Testing the Database

### Test Badge Award

```sql
-- Award a badge to a user
INSERT INTO user_badges (user_id, badge_id)
SELECT 
    auth.uid(),
    id
FROM badges
WHERE name = 'Newcomer';
```

### Test Analytics Event

```sql
-- Log an analytics event
INSERT INTO user_events (user_id, event_type, event_data)
VALUES (
    auth.uid(),
    'page_view',
    '{"page": "/advanced-dashboard", "duration": 45}'::jsonb
);
```

### Test IoT Device

```sql
-- Add an IoT device
INSERT INTO iot_devices (user_id, device_name, device_type, device_id)
VALUES (
    auth.uid(),
    'Apple Watch Series 9',
    'smartwatch',
    'AW-' || gen_random_uuid()
);
```

## Troubleshooting

### Error: "relation already exists"
- Tables already created, safe to ignore or drop and recreate

### Error: "permission denied"
- Ensure you're logged in as admin in Supabase
- Check RLS policies are correctly applied

### Error: "function does not exist"
- Ensure `uuid_generate_v4()` extension is enabled:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```

## Next Steps

After database setup:

1. **Update Hooks** - Modify `useGamification.ts` and `useAnalytics.ts` to use real database queries
2. **Test Integration** - Verify data flows from UI to database
3. **Monitor Performance** - Check query performance in Supabase dashboard
4. **Set up Backups** - Enable automatic backups in Supabase settings

## Rollback

If you need to remove all tables:

```sql
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS public.device_alerts CASCADE;
DROP TABLE IF EXISTS public.health_metrics CASCADE;
DROP TABLE IF EXISTS public.vital_signs CASCADE;
DROP TABLE IF EXISTS public.iot_devices CASCADE;
DROP TABLE IF EXISTS public.user_events CASCADE;
DROP TABLE IF EXISTS public.user_streaks CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
```

## Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify your Supabase project tier supports the features
3. Ensure your database has sufficient resources
4. Review RLS policies if data access issues occur
