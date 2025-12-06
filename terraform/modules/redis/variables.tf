variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where Redis will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for Redis (should be private subnets)"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs for Redis"
  type        = list(string)
}

variable "node_type" {
  description = "Node type for Redis cluster (e.g., cache.t3.micro, cache.t3.small)"
  type        = string
  default     = "cache.t3.micro"
}

variable "num_cache_nodes" {
  description = "Number of cache nodes in the cluster"
  type        = number
  default     = 1

  validation {
    condition     = var.num_cache_nodes >= 1 && var.num_cache_nodes <= 300
    error_message = "Number of cache nodes must be between 1 and 300."
  }
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
