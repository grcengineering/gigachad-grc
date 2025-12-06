variable "name_prefix" {
  description = "Prefix for bucket names"
  type        = string
}

variable "random_suffix" {
  description = "Random suffix for bucket names (to ensure global uniqueness)"
  type        = string
}

variable "enable_versioning" {
  description = "Enable versioning on the S3 bucket"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "Lifecycle rules for S3 bucket"
  type = list(object({
    id     = string
    status = string
    filter = optional(object({
      prefix = optional(string)
    }))
    transitions = optional(list(object({
      days          = number
      storage_class = string
    })))
    expiration = optional(object({
      days = number
    }))
    noncurrent_version_transitions = optional(list(object({
      days          = number
      storage_class = string
    })))
    noncurrent_version_expiration = optional(object({
      days = number
    }))
  }))
  default = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
