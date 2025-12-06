output "endpoint" {
  description = "RDS instance endpoint address (without port)"
  value       = aws_db_instance.main.address
}

output "endpoint_with_port" {
  description = "RDS instance endpoint with port (host:port)"
  value       = "${aws_db_instance.main.address}:${aws_db_instance.main.port}"
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "master_username" {
  description = "RDS master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "instance_id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.main.id
}

output "instance_resource_id" {
  description = "RDS instance resource ID"
  value       = aws_db_instance.main.resource_id
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "parameter_group_name" {
  description = "Name of the DB parameter group"
  value       = aws_db_parameter_group.main.name
}

output "kms_key_id" {
  description = "KMS key ID used for RDS encryption"
  value       = aws_kms_key.rds.id
}
