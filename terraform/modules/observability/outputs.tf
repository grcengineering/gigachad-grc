output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alarms"
  value       = aws_sns_topic.alarms.arn
}

output "log_group_arns" {
  description = "Map of service names to log group ARNs"
  value = {
    for service, log_group in aws_cloudwatch_log_group.services : service => log_group.arn
  }
}

output "flow_log_id" {
  description = "ID of the VPC flow log"
  value       = var.enable_vpc_flow_logs ? aws_flow_log.main[0].id : null
}

output "alarm_arns" {
  description = "Map of alarm names to ARNs"
  value = merge(
    { for k, v in aws_cloudwatch_metric_alarm.ecs_high_cpu : k => v.arn },
    { for k, v in aws_cloudwatch_metric_alarm.ecs_high_memory : k => v.arn },
    {
      "rds-high-cpu"    = aws_cloudwatch_metric_alarm.rds_high_cpu.arn
      "rds-low-storage" = aws_cloudwatch_metric_alarm.rds_low_storage.arn
      "alb-5xx-errors"  = aws_cloudwatch_metric_alarm.alb_5xx_errors.arn
    }
  )
}
