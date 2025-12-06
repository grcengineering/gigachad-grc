output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "target_group_http_arn" {
  description = "ARN of the HTTP target group"
  value       = aws_lb_target_group.http.arn
}

output "target_group_https_arn" {
  description = "ARN of the HTTPS target group"
  value       = aws_lb_target_group.https.arn
}

output "target_group_http_name" {
  description = "Name of the HTTP target group"
  value       = aws_lb_target_group.http.name
}

output "target_group_https_name" {
  description = "Name of the HTTPS target group"
  value       = aws_lb_target_group.https.name
}

output "listener_https_arn" {
  description = "ARN of the HTTPS listener"
  value       = var.enable_https ? aws_lb_listener.https[0].arn : null
}
