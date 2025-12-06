# S3 Module - AWS S3 Bucket with Security Best Practices

# S3 Bucket
resource "aws_s3_bucket" "main" {
  bucket = "${var.name_prefix}-${var.random_suffix}"

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.random_suffix}"
    }
  )
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning
resource "aws_s3_bucket_versioning" "main" {
  count = var.enable_versioning ? 1 : 0

  bucket = aws_s3_bucket.main.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = false
  }
}

# Enable encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

# KMS Key for S3 encryption
resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-s3-key"
    }
  )
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${var.name_prefix}-s3"
  target_key_id = aws_kms_key.s3.key_id
}

# Bucket ACL
resource "aws_s3_bucket_acl" "main" {
  bucket = aws_s3_bucket.main.id
  acl    = "private"
}

# Enable logging
resource "aws_s3_bucket" "log_bucket" {
  bucket = "${var.name_prefix}-logs-${var.random_suffix}"

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-logs-${var.random_suffix}"
    }
  )
}

resource "aws_s3_bucket_versioning" "log_bucket" {
  bucket = aws_s3_bucket.log_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "log_bucket" {
  bucket = aws_s3_bucket.log_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "log_bucket" {
  bucket = aws_s3_bucket.log_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable logging on main bucket
resource "aws_s3_bucket_logging" "main" {
  bucket = aws_s3_bucket.main.id

  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "logs/"
}

# Lifecycle rules
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  count = length(var.lifecycle_rules) > 0 ? 1 : 0

  bucket = aws_s3_bucket.main.id

  dynamic "rule" {
    for_each = var.lifecycle_rules

    content {
      id     = rule.value.id
      status = rule.value.status

      dynamic "filter" {
        for_each = rule.value.filter != null ? [rule.value.filter] : []

        content {
          prefix = filter.value.prefix
        }
      }

      dynamic "transition" {
        for_each = rule.value.transitions != null ? rule.value.transitions : []

        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      dynamic "expiration" {
        for_each = rule.value.expiration != null ? [rule.value.expiration] : []

        content {
          days = expiration.value.days
        }
      }

      dynamic "noncurrent_version_transition" {
        for_each = rule.value.noncurrent_version_transitions != null ? rule.value.noncurrent_version_transitions : []

        content {
          noncurrent_days = noncurrent_version_transition.value.days
          storage_class   = noncurrent_version_transition.value.storage_class
        }
      }

      dynamic "noncurrent_version_expiration" {
        for_each = rule.value.noncurrent_version_expiration != null ? [rule.value.noncurrent_version_expiration] : []

        content {
          noncurrent_days = noncurrent_version_expiration.value.days
        }
      }
    }
  }
}

# Bucket policy to enforce encryption
resource "aws_s3_bucket_policy" "enforce_encryption" {
  bucket = aws_s3_bucket.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.main.arn,
          "${aws_s3_bucket.main.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.main.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      }
    ]
  })
}
