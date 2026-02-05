# GigaChad GRC Platform - AWS Infrastructure
# This Terraform configuration deploys the complete GRC platform to AWS

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.31"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # S3 backend for state management
  # IMPORTANT: Before enabling, create the S3 bucket and DynamoDB table:
  #   1. aws s3api create-bucket --bucket ${var.terraform_state_bucket} --region ${var.aws_region}
  #   2. aws s3api put-bucket-versioning --bucket ${var.terraform_state_bucket} --versioning-configuration Status=Enabled
  #   3. aws s3api put-bucket-encryption --bucket ${var.terraform_state_bucket} --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}'
  #   4. aws dynamodb create-table --table-name terraform-lock --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
  #
  # Then uncomment and configure:
  # backend "s3" {
  #   bucket         = "gigachad-grc-terraform-state"
  #   key            = "gigachad-grc/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-lock"
  #   kms_key_id     = "alias/terraform-state"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "GigaChad-GRC"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Generate random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_nat_gateway  = var.enable_nat_gateway
  single_nat_gateway  = var.single_nat_gateway

  tags = local.common_tags
}

# Security Groups
module "security_groups" {
  source = "./modules/security-groups"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id

  allowed_cidr_blocks = var.allowed_cidr_blocks

  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  security_group_ids = [module.security_groups.alb_security_group_id]

  certificate_arn    = var.ssl_certificate_arn
  enable_https       = var.enable_https

  tags = local.common_tags
}

# RDS PostgreSQL Database
module "rds" {
  source = "./modules/rds"

  name_prefix            = local.name_prefix
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  security_group_ids     = [module.security_groups.rds_security_group_id]

  engine_version         = var.rds_engine_version
  instance_class         = var.rds_instance_class
  allocated_storage      = var.rds_allocated_storage
  max_allocated_storage  = var.rds_max_allocated_storage

  database_name          = var.database_name
  master_username        = var.database_username
  master_password        = var.database_password

  backup_retention_period = var.rds_backup_retention_period
  multi_az               = var.rds_multi_az

  tags = local.common_tags
}

# ElastiCache Redis
module "redis" {
  source = "./modules/redis"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.security_groups.redis_security_group_id]

  node_type          = var.redis_node_type
  num_cache_nodes    = var.redis_num_cache_nodes
  engine_version     = var.redis_engine_version

  tags = local.common_tags
}

# S3 Bucket for File Storage
module "s3" {
  source = "./modules/s3"

  name_prefix    = local.name_prefix
  random_suffix  = random_id.suffix.hex

  enable_versioning = var.s3_enable_versioning
  lifecycle_rules   = var.s3_lifecycle_rules

  tags = local.common_tags
}

# ECS Cluster and Services
module "ecs" {
  source = "./modules/ecs"

  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  alb_target_group_arn = module.alb.target_group_arn
  security_group_ids   = [module.security_groups.ecs_security_group_id]

  # Database configuration
  database_host     = module.rds.endpoint
  database_port     = module.rds.port
  database_name     = var.database_name
  database_username = var.database_username
  database_password = var.database_password

  # Redis configuration
  redis_host = module.redis.endpoint
  redis_port = module.redis.port

  # S3 configuration
  s3_bucket_name = module.s3.bucket_name
  s3_bucket_arn  = module.s3.bucket_arn

  # Container images
  container_registry = var.container_registry
  image_tag          = var.image_tag

  # Service sizing
  service_desired_count = var.ecs_service_desired_count
  task_cpu             = var.ecs_task_cpu
  task_memory          = var.ecs_task_memory

  # Keycloak configuration
  keycloak_url         = var.keycloak_url
  keycloak_realm       = var.keycloak_realm
  keycloak_client_id   = var.keycloak_client_id
  keycloak_client_secret = var.keycloak_client_secret

  tags = local.common_tags
}
