variable "name_prefix" {
  description = "Prefix for naming resources"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "recovery_window_days" {
  description = "Number of days AWS Secrets Manager waits before deleting a secret"
  type        = number
  default     = 30
}

variable "create_kms_key" {
  description = "Whether to create a custom KMS key for encrypting secrets"
  type        = bool
  default     = true
}

# Database credentials
variable "database_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "database_host" {
  description = "Database host"
  type        = string
}

variable "database_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "database_name" {
  description = "Database name"
  type        = string
}

# Redis credentials
variable "redis_host" {
  description = "Redis host"
  type        = string
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  sensitive   = true
}

# Keycloak credentials
variable "keycloak_admin_username" {
  description = "Keycloak admin username"
  type        = string
  default     = "admin"
}

variable "keycloak_admin_password" {
  description = "Keycloak admin password"
  type        = string
  sensitive   = true
}

variable "keycloak_client_id" {
  description = "Keycloak client ID"
  type        = string
}

variable "keycloak_client_secret" {
  description = "Keycloak client secret"
  type        = string
  sensitive   = true
}

variable "keycloak_realm" {
  description = "Keycloak realm name"
  type        = string
  default     = "gigachad-grc"
}

variable "keycloak_url" {
  description = "Keycloak URL"
  type        = string
}

# Application secrets
variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "Data encryption key"
  type        = string
  sensitive   = true
}

variable "session_secret" {
  description = "Session secret"
  type        = string
  sensitive   = true
}

# S3/Storage credentials
variable "s3_access_key" {
  description = "S3-compatible storage access key"
  type        = string
  sensitive   = true
}

variable "s3_secret_key" {
  description = "S3-compatible storage secret key"
  type        = string
  sensitive   = true
}

variable "s3_bucket_name" {
  description = "S3 bucket name"
  type        = string
}

variable "s3_endpoint" {
  description = "S3-compatible endpoint URL"
  type        = string
  default     = ""
}

# ECS Role ARNs for KMS policy
variable "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  type        = string
  default     = ""
}

variable "ecs_execution_role_arn" {
  description = "ARN of the ECS execution role"
  type        = string
  default     = ""
}
