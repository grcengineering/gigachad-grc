# Configuration as Code - Setup Guide

## Database Migration

Configuration as Code models are part of the single shared schema at
`services/shared/prisma/schema.prisma`. In Docker, the controls entrypoint
creates/synchronizes them with the rest of the application schema.

For a disposable host-development database:

```bash
npm run db:generate
npm --workspace @gigachad-grc/controls run prisma:push
```

Do not create a separate service migration. The current Docker flow uses the
controls-owned schema synchronization documented in [Database Schema](DATABASE_SCHEMA.md).

The shared schema includes:
- `config_files` - Stores configuration files
- `config_file_versions` - Stores version history

## Initial Setup

1. **Enable the Module**
   - Navigate to Settings → Module Configuration
   - Enable "Configuration as Code"
   - Click "Save Configuration"

2. **Access the IDE**
   - Navigate to Settings → Configuration as Code
   - The IDE will automatically initialize with your current platform state

3. **Manual Initialization** (if needed)
   - If files don't appear automatically, click "Initialize from platform state" in the file explorer
   - This will export your current GRC resources as Terraform files

## File Structure

After initialization, you'll see:

```
controls/
  └── main.tf      # All controls
frameworks/
  └── main.tf      # All frameworks
policies/
  └── main.tf      # All policies
risks/
  └── main.tf      # All risks
vendors/
  └── main.tf      # All vendors
```

## Troubleshooting

### "No files yet" message persists

1. Check browser console for errors
2. Verify database migration was run successfully
3. Click "Initialize from platform state" button manually
4. Check backend logs for initialization errors

### Database errors

If you see errors about missing tables:
```bash
npm run db:generate
npm --workspace @gigachad-grc/controls run prisma:push
```

### Module not appearing

1. Ensure module is enabled in Settings → Module Configuration
2. Refresh the page (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)
3. Check that `config-as-code` is in the enabled modules list

