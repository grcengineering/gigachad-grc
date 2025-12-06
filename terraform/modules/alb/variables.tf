variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the ALB will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for ALB (should be public subnets)"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs for ALB"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ARN of the SSL/TLS certificate for HTTPS listener"
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Enable HTTPS listener"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
