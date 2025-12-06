# Redis Module - ElastiCache Redis Cluster

# Subnet Group for ElastiCache
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.name_prefix}-redis-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-redis-subnet-group"
    }
  )
}

# Parameter Group for Redis
resource "aws_elasticache_parameter_group" "main" {
  name   = "${var.name_prefix}-redis-params"
  family = "redis${var.engine_version}"

  # Performance and logging parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-redis-params"
    }
  )
}

# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.name_prefix}-redis"
  engine               = "redis"
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_nodes
  engine_version       = var.engine_version
  parameter_group_name = aws_elasticache_parameter_group.main.name
  port                 = 6379

  # Network and security
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = var.security_group_ids
  automatic_failover_enabled = var.num_cache_nodes > 1 ? true : false

  # Maintenance and backup
  maintenance_window = "mon:03:00-mon:04:00"
  snapshot_retention_limit = 5
  snapshot_window    = "02:00-03:00"

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  # Notifications
  notification_topic_arn = aws_sns_topic.elasticache_notifications.arn

  # Enable automatic minor version upgrades
  auto_minor_version_upgrade = true

  # Enable CloudWatch logs
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    enabled          = true
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-redis"
    }
  )

  depends_on = [
    aws_elasticache_subnet_group.main,
    aws_elasticache_parameter_group.main
  ]
}

# Random auth token for Redis
resource "random_password" "redis_auth_token" {
  length  = 32
  special = true
}

# SNS Topic for ElastiCache notifications
resource "aws_sns_topic" "elasticache_notifications" {
  name = "${var.name_prefix}-elasticache-notifications"

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-elasticache-notifications"
    }
  )
}

# CloudWatch Log Group for slow log
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.name_prefix}-redis-slow-log"
  retention_in_days = 7

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-redis-slow-log"
    }
  )
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.name_prefix}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "Redis CPU utilization is too high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.cluster_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.name_prefix}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Redis memory utilization is too high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.cluster_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${var.name_prefix}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Redis is evicting keys due to memory pressure"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.cluster_id
  }

  tags = var.tags
}
