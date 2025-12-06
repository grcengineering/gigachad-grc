output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}

output "bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.main.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

output "log_bucket_name" {
  description = "Name of the S3 log bucket"
  value       = aws_s3_bucket.log_bucket.id
}

output "log_bucket_arn" {
  description = "ARN of the S3 log bucket"
  value       = aws_s3_bucket.log_bucket.arn
}

output "kms_key_id" {
  description = "KMS key ID used for bucket encryption"
  value       = aws_kms_key.s3.id
}

output "kms_key_arn" {
  description = "KMS key ARN used for bucket encryption"
  value       = aws_kms_key.s3.arn
}
