#!/bin/bash
set -e

echo "GigaChad GRC Backup Scheduler starting..."
echo "Timezone: ${TZ:-UTC}"
echo "Backup retention: ${BACKUP_RETENTION_DAYS:-90} days"
echo "Remote backup: ${DR_REMOTE_BACKUP_ENABLED:-false}"

# Update timezone if specified
if [ -n "$TZ" ]; then
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime
    echo $TZ > /etc/timezone
fi

# Substitute environment variables in crontab
envsubst < /etc/crontabs/root > /tmp/crontab.tmp && mv /tmp/crontab.tmp /etc/crontabs/root

# Create log files
touch /var/log/cron/backup.log /var/log/cron/verify.log /var/log/cron/cleanup.log

echo "Backup schedule configured. Starting cron daemon..."

# Run cron in foreground
exec crond -f -l 2
