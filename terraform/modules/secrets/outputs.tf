output "database_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.database.arn
}

output "redis_secret_arn" {
  description = "ARN of the Redis credentials secret"
  value       = aws_secretsmanager_secret.redis.arn
}

output "keycloak_secret_arn" {
  description = "ARN of the Keycloak credentials secret"
  value       = aws_secretsmanager_secret.keycloak.arn
}

output "application_secret_arn" {
  description = "ARN of the application secrets"
  value       = aws_secretsmanager_secret.application.arn
}

output "storage_secret_arn" {
  description = "ARN of the storage credentials secret"
  value       = aws_secretsmanager_secret.storage.arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key for encrypting secrets"
  value       = var.create_kms_key ? aws_kms_key.secrets[0].arn : null
}

output "kms_key_id" {
  description = "ID of the KMS key for encrypting secrets"
  value       = var.create_kms_key ? aws_kms_key.secrets[0].key_id : null
}

# Secret ARNs with specific keys for ECS task definitions
output "database_username_secret_arn" {
  description = "ARN for database username secret"
  value       = "${aws_secretsmanager_secret.database.arn}:username::"
}

output "database_password_secret_arn" {
  description = "ARN for database password secret"
  value       = "${aws_secretsmanager_secret.database.arn}:password::"
}

output "redis_password_secret_arn" {
  description = "ARN for Redis password secret"
  value       = "${aws_secretsmanager_secret.redis.arn}:password::"
}

output "keycloak_client_secret_arn" {
  description = "ARN for Keycloak client secret"
  value       = "${aws_secretsmanager_secret.keycloak.arn}:client_secret::"
}

output "jwt_secret_arn" {
  description = "ARN for JWT secret"
  value       = "${aws_secretsmanager_secret.application.arn}:jwt_secret::"
}

output "encryption_key_secret_arn" {
  description = "ARN for encryption key secret"
  value       = "${aws_secretsmanager_secret.application.arn}:encryption_key::"
}

output "s3_access_key_secret_arn" {
  description = "ARN for S3 access key secret"
  value       = "${aws_secretsmanager_secret.storage.arn}:access_key::"
}

output "s3_secret_key_secret_arn" {
  description = "ARN for S3 secret key secret"
  value       = "${aws_secretsmanager_secret.storage.arn}:secret_key::"
}
