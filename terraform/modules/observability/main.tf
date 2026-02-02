# Observability Module for GigaChad GRC
# Provides CloudWatch dashboards, alarms, and monitoring resources

# CloudWatch Log Groups for all services
resource "aws_cloudwatch_log_group" "services" {
  for_each = toset(var.service_names)
  
  name              = "/ecs/${var.name_prefix}/${each.key}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = {
    Name        = "${var.name_prefix}-${each.key}-logs"
    Environment = var.environment
    Service     = each.key
  }
}

# CloudWatch Dashboard for GRC Platform
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.name_prefix}-overview"

  dashboard_body = jsonencode({
    widgets = concat(
      # Service health widgets
      [
        {
          type   = "metric"
          x      = 0
          y      = 0
          width  = 12
          height = 6
          properties = {
            title  = "ECS Service CPU Utilization"
            region = var.aws_region
            metrics = [
              for service in var.service_names : [
                "AWS/ECS", "CPUUtilization",
                "ClusterName", var.ecs_cluster_name,
                "ServiceName", "${var.name_prefix}-${service}"
              ]
            ]
            period = 300
            stat   = "Average"
            view   = "timeSeries"
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 0
          width  = 12
          height = 6
          properties = {
            title  = "ECS Service Memory Utilization"
            region = var.aws_region
            metrics = [
              for service in var.service_names : [
                "AWS/ECS", "MemoryUtilization",
                "ClusterName", var.ecs_cluster_name,
                "ServiceName", "${var.name_prefix}-${service}"
              ]
            ]
            period = 300
            stat   = "Average"
            view   = "timeSeries"
          }
        }
      ],
      # Database widgets
      [
        {
          type   = "metric"
          x      = 0
          y      = 6
          width  = 8
          height = 6
          properties = {
            title  = "RDS CPU & Connections"
            region = var.aws_region
            metrics = [
              ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id],
              ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id]
            ]
            period = 300
            stat   = "Average"
          }
        },
        {
          type   = "metric"
          x      = 8
          y      = 6
          width  = 8
          height = 6
          properties = {
            title  = "RDS Storage & IOPS"
            region = var.aws_region
            metrics = [
              ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", var.rds_instance_id],
              ["AWS/RDS", "ReadIOPS", "DBInstanceIdentifier", var.rds_instance_id],
              ["AWS/RDS", "WriteIOPS", "DBInstanceIdentifier", var.rds_instance_id]
            ]
            period = 300
            stat   = "Average"
          }
        },
        {
          type   = "metric"
          x      = 16
          y      = 6
          width  = 8
          height = 6
          properties = {
            title  = "RDS Latency"
            region = var.aws_region
            metrics = [
              ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", var.rds_instance_id],
              ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", var.rds_instance_id]
            ]
            period = 300
            stat   = "Average"
          }
        }
      ],
      # ALB widgets
      [
        {
          type   = "metric"
          x      = 0
          y      = 12
          width  = 12
          height = 6
          properties = {
            title  = "ALB Request Count & Latency"
            region = var.aws_region
            metrics = [
              ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix],
              ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix]
            ]
            period = 300
            stat   = "Sum"
          }
        },
        {
          type   = "metric"
          x      = 12
          y      = 12
          width  = 12
          height = 6
          properties = {
            title  = "ALB HTTP Status Codes"
            region = var.aws_region
            metrics = [
              ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", var.alb_arn_suffix],
              ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.alb_arn_suffix],
              ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.alb_arn_suffix]
            ]
            period = 300
            stat   = "Sum"
          }
        }
      ]
    )
  })
}

# SNS Topic for alarms
resource "aws_sns_topic" "alarms" {
  name              = "${var.name_prefix}-alarms"
  kms_master_key_id = var.kms_key_arn

  tags = {
    Name        = "${var.name_prefix}-alarms"
    Environment = var.environment
  }
}

# Email subscription for alarms
resource "aws_sns_topic_subscription" "alarm_email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# High CPU Alarm for ECS Services
resource "aws_cloudwatch_metric_alarm" "ecs_high_cpu" {
  for_each = toset(var.service_names)

  alarm_name          = "${var.name_prefix}-${each.key}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  alarm_description   = "High CPU utilization for ${each.key} service"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = "${var.name_prefix}-${each.key}"
  }

  tags = {
    Name        = "${var.name_prefix}-${each.key}-high-cpu"
    Environment = var.environment
    Service     = each.key
  }
}

# High Memory Alarm for ECS Services
resource "aws_cloudwatch_metric_alarm" "ecs_high_memory" {
  for_each = toset(var.service_names)

  alarm_name          = "${var.name_prefix}-${each.key}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold
  alarm_description   = "High memory utilization for ${each.key} service"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = "${var.name_prefix}-${each.key}"
  }

  tags = {
    Name        = "${var.name_prefix}-${each.key}-high-memory"
    Environment = var.environment
    Service     = each.key
  }
}

# RDS High CPU Alarm
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.name_prefix}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.rds_cpu_alarm_threshold
  alarm_description   = "High CPU utilization for RDS instance"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = {
    Name        = "${var.name_prefix}-rds-high-cpu"
    Environment = var.environment
  }
}

# RDS Low Storage Alarm
resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "${var.name_prefix}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.rds_storage_alarm_threshold_gb * 1024 * 1024 * 1024 # Convert GB to bytes
  alarm_description   = "Low storage space for RDS instance"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = {
    Name        = "${var.name_prefix}-rds-low-storage"
    Environment = var.environment
  }
}

# ALB 5XX Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.name_prefix}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = var.alb_5xx_alarm_threshold
  alarm_description   = "High 5XX error rate on ALB"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  treat_missing_data = "notBreaching"

  tags = {
    Name        = "${var.name_prefix}-alb-5xx-errors"
    Environment = var.environment
  }
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  count                = var.enable_vpc_flow_logs ? 1 : 0
  iam_role_arn         = aws_iam_role.flow_log[0].arn
  log_destination      = aws_cloudwatch_log_group.flow_log[0].arn
  traffic_type         = "ALL"
  vpc_id               = var.vpc_id
  max_aggregation_interval = 60

  tags = {
    Name        = "${var.name_prefix}-vpc-flow-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "flow_log" {
  count             = var.enable_vpc_flow_logs ? 1 : 0
  name              = "/vpc/${var.name_prefix}/flow-logs"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn

  tags = {
    Name        = "${var.name_prefix}-flow-logs"
    Environment = var.environment
  }
}

resource "aws_iam_role" "flow_log" {
  count = var.enable_vpc_flow_logs ? 1 : 0
  name  = "${var.name_prefix}-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.name_prefix}-flow-log-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "flow_log" {
  count = var.enable_vpc_flow_logs ? 1 : 0
  name  = "${var.name_prefix}-flow-log-policy"
  role  = aws_iam_role.flow_log[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}
