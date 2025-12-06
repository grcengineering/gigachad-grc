variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where RDS will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for RDS (should be private subnets)"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs for RDS"
  type        = list(string)
}

variable "instance_class" {
  description = "RDS instance class (e.g., db.t3.micro, db.t3.small)"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling in GB"
  type        = number
  default     = 100
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15"
}

variable "database_name" {
  description = "Name of the default database"
  type        = string
  default     = "gigachad"
}

variable "master_username" {
  description = "Master username for RDS"
  type        = string
  sensitive   = true
}

variable "master_password" {
  description = "Master password for RDS (should be at least 8 characters)"
  type        = string
  sensitive   = true
}

variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
