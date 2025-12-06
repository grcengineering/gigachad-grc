output "endpoint" {
  description = "Redis cluster endpoint address"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "port" {
  description = "Redis cluster port"
  value       = aws_elasticache_cluster.main.port
}

output "configuration_endpoint" {
  description = "Redis cluster endpoint with port (host:port)"
  value       = "${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.port}"
}

output "cluster_id" {
  description = "Redis cluster ID"
  value       = aws_elasticache_cluster.main.cluster_id
}

output "subnet_group_name" {
  description = "Name of the ElastiCache subnet group"
  value       = aws_elasticache_subnet_group.main.name
}

output "parameter_group_name" {
  description = "Name of the ElastiCache parameter group"
  value       = aws_elasticache_parameter_group.main.name
}

output "auth_token" {
  description = "Authentication token for Redis"
  value       = random_password.redis_auth_token.result
  sensitive   = true
}

output "security_group_id" {
  description = "Security group ID for Redis"
  value       = var.security_group_ids[0]
}
