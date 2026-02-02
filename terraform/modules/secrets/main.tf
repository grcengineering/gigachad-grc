# Secrets Manager module for GigaChad GRC
# Centralizes all sensitive configuration

# Database credentials secret
resource "aws_secretsmanager_secret" "database" {
  name                    = "${var.name_prefix}/database"
  description             = "Database credentials for GigaChad GRC"
  recovery_window_in_days = var.recovery_window_days

  tags = {
    Name        = "${var.name_prefix}-database-secret"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = var.database_username
    password = var.database_password
    host     = var.database_host
    port     = var.database_port
    dbname   = var.database_name
  })
}

# Redis credentials secret
resource "aws_secretsmanager_secret" "redis" {
  name                    = "${var.name_prefix}/redis"
  description             = "Redis credentials for GigaChad GRC"
  recovery_window_in_days = var.recovery_window_days

  tags = {
    Name        = "${var.name_prefix}-redis-secret"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    host     = var.redis_host
    port     = var.redis_port
    password = var.redis_password
  })
}

# Keycloak credentials secret
resource "aws_secretsmanager_secret" "keycloak" {
  name                    = "${var.name_prefix}/keycloak"
  description             = "Keycloak credentials for GigaChad GRC"
  recovery_window_in_days = var.recovery_window_days

  tags = {
    Name        = "${var.name_prefix}-keycloak-secret"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "keycloak" {
  secret_id = aws_secretsmanager_secret.keycloak.id
  secret_string = jsonencode({
    admin_username = var.keycloak_admin_username
    admin_password = var.keycloak_admin_password
    client_id      = var.keycloak_client_id
    client_secret  = var.keycloak_client_secret
    realm          = var.keycloak_realm
    url            = var.keycloak_url
  })
}

# Application secrets (JWT, encryption keys, etc.)
resource "aws_secretsmanager_secret" "application" {
  name                    = "${var.name_prefix}/application"
  description             = "Application secrets for GigaChad GRC"
  recovery_window_in_days = var.recovery_window_days

  tags = {
    Name        = "${var.name_prefix}-application-secret"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "application" {
  secret_id = aws_secretsmanager_secret.application.id
  secret_string = jsonencode({
    jwt_secret        = var.jwt_secret
    encryption_key    = var.encryption_key
    session_secret    = var.session_secret
  })
}

# S3/Object storage credentials secret
resource "aws_secretsmanager_secret" "storage" {
  name                    = "${var.name_prefix}/storage"
  description             = "Object storage credentials for GigaChad GRC"
  recovery_window_in_days = var.recovery_window_days

  tags = {
    Name        = "${var.name_prefix}-storage-secret"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "storage" {
  secret_id = aws_secretsmanager_secret.storage.id
  secret_string = jsonencode({
    access_key = var.s3_access_key
    secret_key = var.s3_secret_key
    bucket     = var.s3_bucket_name
    endpoint   = var.s3_endpoint
  })
}

# KMS key for encrypting secrets
resource "aws_kms_key" "secrets" {
  count                   = var.create_kms_key ? 1 : 0
  description             = "KMS key for encrypting GigaChad GRC secrets"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow ECS Task Role"
        Effect = "Allow"
        Principal = {
          AWS = var.ecs_task_role_arn
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow ECS Execution Role"
        Effect = "Allow"
        Principal = {
          AWS = var.ecs_execution_role_arn
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.name_prefix}-secrets-kms-key"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "secrets" {
  count         = var.create_kms_key ? 1 : 0
  name          = "alias/${var.name_prefix}-secrets"
  target_key_id = aws_kms_key.secrets[0].key_id
}

data "aws_caller_identity" "current" {}
