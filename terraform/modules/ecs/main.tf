# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.name_prefix}-cluster"
    Environment = var.environment
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.name_prefix}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.name_prefix}-ecs-task-execution-role"
    Environment = var.environment
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager and CloudWatch
resource "aws_iam_role_policy" "ecs_task_execution_additional" {
  name = "${var.name_prefix}-ecs-task-execution-additional"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "kms:Decrypt"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Role for ECS Tasks (container permissions)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.name_prefix}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.name_prefix}-ecs-task-role"
    Environment = var.environment
  }
}

# Task role policy for S3, CloudWatch, and Secrets Manager
resource "aws_iam_role_policy" "ecs_task_role_policy" {
  name = "${var.name_prefix}-ecs-task-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.s3_bucket_arn,
          "${var.s3_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# Service Discovery Namespace (AWS Cloud Map)
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.name_prefix}.local"
  description = "Private DNS namespace for GigaChad GRC services"
  vpc         = var.vpc_id

  tags = {
    Name        = "${var.name_prefix}-namespace"
    Environment = var.environment
  }
}

# CloudWatch Log Groups for each service
resource "aws_cloudwatch_log_group" "controls" {
  name              = "/ecs/${var.name_prefix}/controls"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-controls-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "frameworks" {
  name              = "/ecs/${var.name_prefix}/frameworks"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-frameworks-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "policies" {
  name              = "/ecs/${var.name_prefix}/policies"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-policies-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "tprm" {
  name              = "/ecs/${var.name_prefix}/tprm"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-tprm-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "trust" {
  name              = "/ecs/${var.name_prefix}/trust"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-trust-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "audit" {
  name              = "/ecs/${var.name_prefix}/audit"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-audit-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.name_prefix}/frontend"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-frontend-logs"
    Environment = var.environment
  }
}

# Service Discovery Services
resource "aws_service_discovery_service" "controls" {
  name = "controls"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "frameworks" {
  name = "frameworks"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "policies" {
  name = "policies"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "tprm" {
  name = "tprm"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "trust" {
  name = "trust"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_service_discovery_service" "audit" {
  name = "audit"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Task Definition - Controls Service
resource "aws_ecs_task_definition" "controls" {
  family                   = "${var.name_prefix}-controls"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "controls"
      image     = "${var.container_registry}/controls:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3001"
        },
        {
          name  = "DATABASE_HOST"
          value = var.database_host
        },
        {
          name  = "DATABASE_PORT"
          value = tostring(var.database_port)
        },
        {
          name  = "DATABASE_NAME"
          value = var.database_name
        },
        {
          name  = "DATABASE_USERNAME"
          value = var.database_username
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.database_username}:${var.database_password}@${var.database_host}:${var.database_port}/${var.database_name}"
        },
        {
          name  = "REDIS_HOST"
          value = var.redis_host
        },
        {
          name  = "REDIS_PORT"
          value = tostring(var.redis_port)
        },
        {
          name  = "REDIS_URL"
          value = "redis://${var.redis_host}:${var.redis_port}"
        },
        {
          name  = "S3_BUCKET"
          value = var.s3_bucket_name
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "KEYCLOAK_URL"
          value = var.keycloak_url
        },
        {
          name  = "KEYCLOAK_REALM"
          value = var.keycloak_realm
        },
        {
          name  = "KEYCLOAK_CLIENT_ID"
          value = var.keycloak_client_id
        }
      ]

      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = "${var.database_secret_arn}:password::"
        },
        {
          name      = "KEYCLOAK_CLIENT_SECRET"
          valueFrom = "${var.keycloak_secret_arn}:client_secret::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.controls.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.name_prefix}-controls-task"
    Environment = var.environment
  }
}

# Task Definition - Frameworks Service
resource "aws_ecs_task_definition" "frameworks" {
  family                   = "${var.name_prefix}-frameworks"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "frameworks"
      image     = "${var.container_registry}/frameworks:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3002
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3002"
        },
        {
          name  = "DATABASE_HOST"
          value = var.database_host
        },
        {
          name  = "DATABASE_PORT"
          value = tostring(var.database_port)
        },
        {
          name  = "DATABASE_NAME"
          value = var.database_name
        },
        {
          name  = "DATABASE_USERNAME"
          value = var.database_username
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.database_username}:${var.database_password}@${var.database_host}:${var.database_port}/${var.database_name}"
        },
        {
          name  = "REDIS_HOST"
          value = var.redis_host
        },
        {
          name  = "REDIS_PORT"
          value = tostring(var.redis_port)
        },
        {
          name  = "REDIS_URL"
          value = "redis://${var.redis_host}:${var.redis_port}"
        },
        {
          name  = "S3_BUCKET"
          value = var.s3_bucket_name
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "KEYCLOAK_URL"
          value = var.keycloak_url
        },
        {
          name  = "KEYCLOAK_REALM"
          value = var.keycloak_realm
        },
        {
          name  = "KEYCLOAK_CLIENT_ID"
          value = var.keycloak_client_id
        },
        {
          name  = "CONTROLS_SERVICE_URL"
          value = "http://controls.${var.name_prefix}.local:3001"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = "${var.database_secret_arn}:password::"
        },
        {
          name      = "KEYCLOAK_CLIENT_SECRET"
          valueFrom = "${var.keycloak_secret_arn}:client_secret::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frameworks.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3002/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.name_prefix}-frameworks-task"
    Environment = var.environment
  }
}

# Task Definition - Policies Service
resource "aws_ecs_task_definition" "policies" {
  family                   = "${var.name_prefix}-policies"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "policies"
      image     = "${var.container_registry}/policies:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3004
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3004"
        },
        {
          name  = "DATABASE_HOST"
          value = var.database_host
        },
        {
          name  = "DATABASE_PORT"
          value = tostring(var.database_port)
        },
        {
          name  = "DATABASE_NAME"
          value = var.database_name
        },
        {
          name  = "DATABASE_USERNAME"
          value = var.database_username
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.database_username}:${var.database_password}@${var.database_host}:${var.database_port}/${var.database_name}"
        },
        {
          name  = "REDIS_HOST"
          value = var.redis_host
        },
        {
          name  = "REDIS_PORT"
          value = tostring(var.redis_port)
        },
        {
          name  = "REDIS_URL"
          value = "redis://${var.redis_host}:${var.redis_port}"
        },
        {
          name  = "S3_BUCKET"
          value = var.s3_bucket_name
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "KEYCLOAK_URL"
          value = var.keycloak_url
        },
        {
          name  = "KEYCLOAK_REALM"
          value = var.keycloak_realm
        },
        {
          name  = "KEYCLOAK_CLIENT_ID"
          value = var.keycloak_client_id
        }
      ]

      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = "${var.database_secret_arn}:password::"
        },
        {
          name      = "KEYCLOAK_CLIENT_SECRET"
          valueFrom = "${var.keycloak_secret_arn}:client_secret::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.policies.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3004/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.name_prefix}-policies-task"
    Environment = var.environment
  }
}

# Task Definition - TPRM Service
resource "aws_ecs_task_definition" "tprm" {
  family                   = "${var.name_prefix}-tprm"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "tprm"
      image     = "${var.container_registry}/tprm:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3005
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3005"
        },
        {
          name  = "DATABASE_HOST"
          value = var.database_host
        },
        {
          name  = "DATABASE_PORT"
          value = tostring(var.database_port)
        },
        {
          name  = "DATABASE_NAME"
          value = var.database_name
        },
        {
          name  = "DATABASE_USERNAME"
          value = var.database_username
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.database_username}:${var.database_password}@${var.database_host}:${var.database_port}/${var.database_name}"
        },
        {
          name  = "REDIS_HOST"
          value = var.redis_host
        },
        {
          name  = "REDIS_PORT"
          value = tostring(var.redis_port)
        },
        {
          name  = "REDIS_URL"
          value = "redis://${var.redis_host}:${var.redis_port}"
        },
        {
          name  = "S3_BUCKET"
          value = var.s3_bucket_name
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "KEYCLOAK_URL"
          value = var.keycloak_url
        },
        {
          name  = "KEYCLOAK_REALM"
          value = var.keycloak_realm
        },
        {
          name  = "KEYCLOAK_CLIENT_ID"
          value = var.keycloak_client_id
        },
        {
          name  = "POLICIES_SERVICE_URL"
          value = "http://policies.${var.name_prefix}.local:3004"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = "${var.database_secret_arn}:password::"
        },
        {
          name      = "KEYCLOAK_CLIENT_SECRET"
          valueFrom = "${var.keycloak_secret_arn}:client_secret::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.tprm.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3005/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.name_prefix}-tprm-task"
    Environment = var.environment
  }
}

# Task Definition - Trust Service
resource "aws_ecs_task_definition" "trust" {
  family                   = "${var.name_prefix}-trust"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "trust"
      image     = "${var.container_registry}/trust:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3006
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3006"
        },
        {
          name  = "DATABASE_HOST"
          value = var.database_host
        },
        {
          name  = "DATABASE_PORT"
          value = tostring(var.database_port)
        },
        {
          name  = "DATABASE_NAME"
          value = var.database_name
        },
        {
          name  = "DATABASE_USERNAME"
          value = var.database_username
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.database_username}:${var.database_password}@${var.database_host}:${var.database_port}/${var.database_name}"
        },
        {
          name  = "REDIS_HOST"
          value = var.redis_host
        },
        {
          name  = "REDIS_PORT"
          value = tostring(var.redis_port)
        },
        {
          name  = "REDIS_URL"
          value = "redis://${var.redis_host}:${var.redis_port}"
        },
        {
          name  = "S3_BUCKET"
          value = var.s3_bucket_name
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "KEYCLOAK_URL"
          value = var.keycloak_url
        },
        {
          name  = "KEYCLOAK_REALM"
          value = var.keycloak_realm
        },
        {
          name  = "KEYCLOAK_CLIENT_ID"
          value = var.keycloak_client_id
        }
      ]

      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = "${var.database_secret_arn}:password::"
        },
        {
          name      = "KEYCLOAK_CLIENT_SECRET"
          valueFrom = "${var.keycloak_secret_arn}:client_secret::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.trust.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3006/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.name_prefix}-trust-task"
    Environment = var.environment
  }
}

# Task Definition - Audit Service
resource "aws_ecs_task_definition" "audit" {
  family                   = "${var.name_prefix}-audit"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "audit"
      image     = "${var.container_registry}/audit:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3007
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3007"
        },
        {
          name  = "DATABASE_HOST"
          value = var.database_host
        },
        {
          name  = "DATABASE_PORT"
          value = tostring(var.database_port)
        },
        {
          name  = "DATABASE_NAME"
          value = var.database_name
        },
        {
          name  = "DATABASE_USERNAME"
          value = var.database_username
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.database_username}:${var.database_password}@${var.database_host}:${var.database_port}/${var.database_name}"
        },
        {
          name  = "REDIS_HOST"
          value = var.redis_host
        },
        {
          name  = "REDIS_PORT"
          value = tostring(var.redis_port)
        },
        {
          name  = "REDIS_URL"
          value = "redis://${var.redis_host}:${var.redis_port}"
        },
        {
          name  = "S3_BUCKET"
          value = var.s3_bucket_name
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "KEYCLOAK_URL"
          value = var.keycloak_url
        },
        {
          name  = "KEYCLOAK_REALM"
          value = var.keycloak_realm
        },
        {
          name  = "KEYCLOAK_CLIENT_ID"
          value = var.keycloak_client_id
        }
      ]

      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = "${var.database_secret_arn}:password::"
        },
        {
          name      = "KEYCLOAK_CLIENT_SECRET"
          valueFrom = "${var.keycloak_secret_arn}:client_secret::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.audit.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3007/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.name_prefix}-audit-task"
    Environment = var.environment
  }
}

# Task Definition - Frontend
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.name_prefix}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${var.container_registry}/frontend:${var.image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "CONTROLS_SERVICE_URL"
          value = "http://controls.${var.name_prefix}.local:3001"
        },
        {
          name  = "FRAMEWORKS_SERVICE_URL"
          value = "http://frameworks.${var.name_prefix}.local:3002"
        },
        {
          name  = "POLICIES_SERVICE_URL"
          value = "http://policies.${var.name_prefix}.local:3004"
        },
        {
          name  = "TPRM_SERVICE_URL"
          value = "http://tprm.${var.name_prefix}.local:3005"
        },
        {
          name  = "TRUST_SERVICE_URL"
          value = "http://trust.${var.name_prefix}.local:3006"
        },
        {
          name  = "AUDIT_SERVICE_URL"
          value = "http://audit.${var.name_prefix}.local:3007"
        },
        {
          name  = "KEYCLOAK_URL"
          value = var.keycloak_url
        },
        {
          name  = "KEYCLOAK_REALM"
          value = var.keycloak_realm
        },
        {
          name  = "KEYCLOAK_CLIENT_ID"
          value = var.keycloak_client_id
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.name_prefix}-frontend-task"
    Environment = var.environment
  }
}

# ECS Service - Controls
resource "aws_ecs_service" "controls" {
  name            = "${var.name_prefix}-controls"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.controls.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arns["controls"]
    container_name   = "controls"
    container_port   = 3001
  }

  service_registries {
    registry_arn = aws_service_discovery_service.controls.arn
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.name_prefix}-controls-service"
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]
}

# ECS Service - Frameworks
resource "aws_ecs_service" "frameworks" {
  name            = "${var.name_prefix}-frameworks"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frameworks.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arns["frameworks"]
    container_name   = "frameworks"
    container_port   = 3002
  }

  service_registries {
    registry_arn = aws_service_discovery_service.frameworks.arn
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.name_prefix}-frameworks-service"
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]
}

# ECS Service - Policies
resource "aws_ecs_service" "policies" {
  name            = "${var.name_prefix}-policies"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.policies.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arns["policies"]
    container_name   = "policies"
    container_port   = 3004
  }

  service_registries {
    registry_arn = aws_service_discovery_service.policies.arn
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.name_prefix}-policies-service"
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]
}

# ECS Service - TPRM
resource "aws_ecs_service" "tprm" {
  name            = "${var.name_prefix}-tprm"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.tprm.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arns["tprm"]
    container_name   = "tprm"
    container_port   = 3005
  }

  service_registries {
    registry_arn = aws_service_discovery_service.tprm.arn
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.name_prefix}-tprm-service"
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]
}

# ECS Service - Trust
resource "aws_ecs_service" "trust" {
  name            = "${var.name_prefix}-trust"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.trust.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arns["trust"]
    container_name   = "trust"
    container_port   = 3006
  }

  service_registries {
    registry_arn = aws_service_discovery_service.trust.arn
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.name_prefix}-trust-service"
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]
}

# ECS Service - Audit
resource "aws_ecs_service" "audit" {
  name            = "${var.name_prefix}-audit"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.audit.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arns["audit"]
    container_name   = "audit"
    container_port   = 3007
  }

  service_registries {
    registry_arn = aws_service_discovery_service.audit.arn
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.name_prefix}-audit-service"
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]
}

# ECS Service - Frontend
resource "aws_ecs_service" "frontend" {
  name            = "${var.name_prefix}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arns["frontend"]
    container_name   = "frontend"
    container_port   = 3000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.name_prefix}-frontend-service"
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy
  ]
}

# Auto Scaling Target - Controls
resource "aws_appautoscaling_target" "controls" {
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.controls.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - Controls CPU
resource "aws_appautoscaling_policy" "controls_cpu" {
  name               = "${var.name_prefix}-controls-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.controls.resource_id
  scalable_dimension = aws_appautoscaling_target.controls.scalable_dimension
  service_namespace  = aws_appautoscaling_target.controls.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy - Controls Memory
resource "aws_appautoscaling_policy" "controls_memory" {
  name               = "${var.name_prefix}-controls-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.controls.resource_id
  scalable_dimension = aws_appautoscaling_target.controls.scalable_dimension
  service_namespace  = aws_appautoscaling_target.controls.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Target - Frameworks
resource "aws_appautoscaling_target" "frameworks" {
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frameworks.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - Frameworks CPU
resource "aws_appautoscaling_policy" "frameworks_cpu" {
  name               = "${var.name_prefix}-frameworks-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frameworks.resource_id
  scalable_dimension = aws_appautoscaling_target.frameworks.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frameworks.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy - Frameworks Memory
resource "aws_appautoscaling_policy" "frameworks_memory" {
  name               = "${var.name_prefix}-frameworks-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frameworks.resource_id
  scalable_dimension = aws_appautoscaling_target.frameworks.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frameworks.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Target - Policies
resource "aws_appautoscaling_target" "policies" {
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.policies.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - Policies CPU
resource "aws_appautoscaling_policy" "policies_cpu" {
  name               = "${var.name_prefix}-policies-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.policies.resource_id
  scalable_dimension = aws_appautoscaling_target.policies.scalable_dimension
  service_namespace  = aws_appautoscaling_target.policies.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy - Policies Memory
resource "aws_appautoscaling_policy" "policies_memory" {
  name               = "${var.name_prefix}-policies-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.policies.resource_id
  scalable_dimension = aws_appautoscaling_target.policies.scalable_dimension
  service_namespace  = aws_appautoscaling_target.policies.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Target - TPRM
resource "aws_appautoscaling_target" "tprm" {
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.tprm.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - TPRM CPU
resource "aws_appautoscaling_policy" "tprm_cpu" {
  name               = "${var.name_prefix}-tprm-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.tprm.resource_id
  scalable_dimension = aws_appautoscaling_target.tprm.scalable_dimension
  service_namespace  = aws_appautoscaling_target.tprm.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy - TPRM Memory
resource "aws_appautoscaling_policy" "tprm_memory" {
  name               = "${var.name_prefix}-tprm-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.tprm.resource_id
  scalable_dimension = aws_appautoscaling_target.tprm.scalable_dimension
  service_namespace  = aws_appautoscaling_target.tprm.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Target - Trust
resource "aws_appautoscaling_target" "trust" {
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.trust.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - Trust CPU
resource "aws_appautoscaling_policy" "trust_cpu" {
  name               = "${var.name_prefix}-trust-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.trust.resource_id
  scalable_dimension = aws_appautoscaling_target.trust.scalable_dimension
  service_namespace  = aws_appautoscaling_target.trust.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy - Trust Memory
resource "aws_appautoscaling_policy" "trust_memory" {
  name               = "${var.name_prefix}-trust-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.trust.resource_id
  scalable_dimension = aws_appautoscaling_target.trust.scalable_dimension
  service_namespace  = aws_appautoscaling_target.trust.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Target - Audit
resource "aws_appautoscaling_target" "audit" {
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.audit.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - Audit CPU
resource "aws_appautoscaling_policy" "audit_cpu" {
  name               = "${var.name_prefix}-audit-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.audit.resource_id
  scalable_dimension = aws_appautoscaling_target.audit.scalable_dimension
  service_namespace  = aws_appautoscaling_target.audit.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy - Audit Memory
resource "aws_appautoscaling_policy" "audit_memory" {
  name               = "${var.name_prefix}-audit-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.audit.resource_id
  scalable_dimension = aws_appautoscaling_target.audit.scalable_dimension
  service_namespace  = aws_appautoscaling_target.audit.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Target - Frontend
resource "aws_appautoscaling_target" "frontend" {
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frontend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - Frontend CPU
resource "aws_appautoscaling_policy" "frontend_cpu" {
  name               = "${var.name_prefix}-frontend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling Policy - Frontend Memory
resource "aws_appautoscaling_policy" "frontend_memory" {
  name               = "${var.name_prefix}-frontend-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
