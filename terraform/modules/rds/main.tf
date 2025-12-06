# RDS Module - PostgreSQL Database

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-db-subnet-group"
    }
  )
}

# RDS Parameter Group
resource "aws_db_parameter_group" "main" {
  name   = "${var.name_prefix}-db-params"
  family = "postgres${var.engine_version}"

  # Performance and logging parameters
  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_duration"
    value = "true"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-db-params"
    }
  )
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier     = "${var.name_prefix}-db"
  engine         = "postgres"
  engine_version = var.engine_version

  instance_class           = var.instance_class
  allocated_storage        = var.allocated_storage
  max_allocated_storage    = var.max_allocated_storage
  storage_type             = "gp3"
  storage_encrypted        = true
  kms_key_id               = aws_kms_key.rds.arn

  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  # Network and security
  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = var.security_group_ids
  publicly_accessible             = false
  multi_az                        = var.multi_az

  # Backup and recovery
  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  copy_tags_to_snapshot   = true

  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name

  # High availability
  skip_final_snapshot             = false
  final_snapshot_identifier       = "${var.name_prefix}-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  deletion_protection             = true
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-db"
    }
  )

  depends_on = [
    aws_db_subnet_group.main,
    aws_db_parameter_group.main
  ]
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-rds-key"
    }
  )
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.name_prefix}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# CloudWatch Alarms for RDS
resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "${var.name_prefix}-db-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Database CPU utilization is too high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "db_storage" {
  alarm_name          = "${var.name_prefix}-db-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2147483648" # 2 GB
  alarm_description   = "Database free storage space is low"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.tags
}
