output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "service_names" {
  description = "Map of service names"
  value = {
    controls   = aws_ecs_service.controls.name
    frameworks = aws_ecs_service.frameworks.name
    policies   = aws_ecs_service.policies.name
    tprm       = aws_ecs_service.tprm.name
    trust      = aws_ecs_service.trust.name
    audit      = aws_ecs_service.audit.name
    frontend   = aws_ecs_service.frontend.name
  }
}

output "service_arns" {
  description = "Map of service ARNs"
  value = {
    controls   = aws_ecs_service.controls.id
    frameworks = aws_ecs_service.frameworks.id
    policies   = aws_ecs_service.policies.id
    tprm       = aws_ecs_service.tprm.id
    trust      = aws_ecs_service.trust.id
    audit      = aws_ecs_service.audit.id
    frontend   = aws_ecs_service.frontend.id
  }
}

output "task_definition_arns" {
  description = "Map of task definition ARNs"
  value = {
    controls   = aws_ecs_task_definition.controls.arn
    frameworks = aws_ecs_task_definition.frameworks.arn
    policies   = aws_ecs_task_definition.policies.arn
    tprm       = aws_ecs_task_definition.tprm.arn
    trust      = aws_ecs_task_definition.trust.arn
    audit      = aws_ecs_task_definition.audit.arn
    frontend   = aws_ecs_task_definition.frontend.arn
  }
}

output "task_definition_families" {
  description = "Map of task definition families"
  value = {
    controls   = aws_ecs_task_definition.controls.family
    frameworks = aws_ecs_task_definition.frameworks.family
    policies   = aws_ecs_task_definition.policies.family
    tprm       = aws_ecs_task_definition.tprm.family
    trust      = aws_ecs_task_definition.trust.family
    audit      = aws_ecs_task_definition.audit.family
    frontend   = aws_ecs_task_definition.frontend.family
  }
}

output "task_execution_role_arn" {
  description = "IAM role ARN for ECS task execution"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "task_role_arn" {
  description = "IAM role ARN for ECS tasks (container permissions)"
  value       = aws_iam_role.ecs_task_role.arn
}

output "iam_role_arns" {
  description = "Map of IAM role ARNs"
  value = {
    task_execution_role = aws_iam_role.ecs_task_execution_role.arn
    task_role           = aws_iam_role.ecs_task_role.arn
  }
}

output "service_discovery_namespace_id" {
  description = "Service discovery namespace ID"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "service_discovery_namespace_name" {
  description = "Service discovery namespace name"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "service_discovery_service_ids" {
  description = "Map of service discovery service IDs"
  value = {
    controls   = aws_service_discovery_service.controls.id
    frameworks = aws_service_discovery_service.frameworks.id
    policies   = aws_service_discovery_service.policies.id
    tprm       = aws_service_discovery_service.tprm.id
    trust      = aws_service_discovery_service.trust.id
    audit      = aws_service_discovery_service.audit.id
  }
}

output "cloudwatch_log_group_names" {
  description = "Map of CloudWatch log group names"
  value = {
    controls   = aws_cloudwatch_log_group.controls.name
    frameworks = aws_cloudwatch_log_group.frameworks.name
    policies   = aws_cloudwatch_log_group.policies.name
    tprm       = aws_cloudwatch_log_group.tprm.name
    trust      = aws_cloudwatch_log_group.trust.name
    audit      = aws_cloudwatch_log_group.audit.name
    frontend   = aws_cloudwatch_log_group.frontend.name
  }
}

output "autoscaling_target_ids" {
  description = "Map of autoscaling target resource IDs"
  value = {
    controls   = aws_appautoscaling_target.controls.resource_id
    frameworks = aws_appautoscaling_target.frameworks.resource_id
    policies   = aws_appautoscaling_target.policies.resource_id
    tprm       = aws_appautoscaling_target.tprm.resource_id
    trust      = aws_appautoscaling_target.trust.resource_id
    audit      = aws_appautoscaling_target.audit.resource_id
    frontend   = aws_appautoscaling_target.frontend.resource_id
  }
}

output "service_endpoints" {
  description = "Internal service endpoints for inter-service communication"
  value = {
    controls   = "http://controls.${aws_service_discovery_private_dns_namespace.main.name}:3001"
    frameworks = "http://frameworks.${aws_service_discovery_private_dns_namespace.main.name}:3002"
    policies   = "http://policies.${aws_service_discovery_private_dns_namespace.main.name}:3004"
    tprm       = "http://tprm.${aws_service_discovery_private_dns_namespace.main.name}:3005"
    trust      = "http://trust.${aws_service_discovery_private_dns_namespace.main.name}:3006"
    audit      = "http://audit.${aws_service_discovery_private_dns_namespace.main.name}:3007"
  }
}
