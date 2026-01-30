# =============================================================================
# Outputs - Lambda API Handler
# =============================================================================

# -----------------------------------------------------------------------------
# Lambda Outputs
# -----------------------------------------------------------------------------

output "auth_handler_function_name" {
  description = "Nome da Lambda de autenticacao"
  value       = aws_lambda_function.auth_handler.function_name
}

output "auth_handler_function_arn" {
  description = "ARN da Lambda de autenticacao"
  value       = aws_lambda_function.auth_handler.arn
}

output "authorizer_function_name" {
  description = "Nome da Lambda authorizer"
  value       = aws_lambda_function.authorizer.function_name
}

output "authorizer_function_arn" {
  description = "ARN da Lambda authorizer"
  value       = aws_lambda_function.authorizer.arn
}

# -----------------------------------------------------------------------------
# API Gateway Outputs
# -----------------------------------------------------------------------------

output "api_gateway_id" {
  description = "ID do API Gateway"
  value       = aws_apigatewayv2_api.main.id
}

output "api_gateway_endpoint" {
  description = "Endpoint do API Gateway"
  value       = aws_apigatewayv2_stage.main.invoke_url
}

output "api_gateway_stage" {
  description = "Stage do API Gateway"
  value       = aws_apigatewayv2_stage.main.name
}

output "authorizer_id" {
  description = "ID do Lambda Authorizer"
  value       = aws_apigatewayv2_authorizer.jwt.id
}

# -----------------------------------------------------------------------------
# CloudWatch Outputs
# -----------------------------------------------------------------------------

output "auth_handler_log_group" {
  description = "Log group da Lambda de autenticacao"
  value       = aws_cloudwatch_log_group.auth_handler.name
}

output "authorizer_log_group" {
  description = "Log group da Lambda authorizer"
  value       = aws_cloudwatch_log_group.authorizer.name
}

output "api_gateway_log_group" {
  description = "Log group do API Gateway"
  value       = aws_cloudwatch_log_group.api_gateway.name
}

# -----------------------------------------------------------------------------
# IAM Outputs
# -----------------------------------------------------------------------------

output "lambda_execution_role_arn" {
  description = "ARN da role de execucao das Lambdas"
  value       = aws_iam_role.lambda_execution.arn
}

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

output "auth_endpoints" {
  description = "Endpoints de autenticacao"
  value = {
    login     = "${aws_apigatewayv2_stage.main.invoke_url}/auth/login"
    login_cpf = "${aws_apigatewayv2_stage.main.invoke_url}/auth/login/cpf"
    refresh   = "${aws_apigatewayv2_stage.main.invoke_url}/auth/refresh"
    logout    = "${aws_apigatewayv2_stage.main.invoke_url}/auth/logout"
  }
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

output "summary" {
  description = "Resumo da infraestrutura"
  value       = <<-EOT
    ================================================================================
    FIAP Tech Challenge - Lambda API Handler
    ================================================================================

    Lambda Functions:
      Auth Handler: ${aws_lambda_function.auth_handler.function_name}
      Authorizer: ${aws_lambda_function.authorizer.function_name}

    API Gateway:
      Endpoint: ${aws_apigatewayv2_stage.main.invoke_url}
      Stage: ${aws_apigatewayv2_stage.main.name}

    Auth Endpoints:
      POST ${aws_apigatewayv2_stage.main.invoke_url}/auth/login       (Email/Password)
      POST ${aws_apigatewayv2_stage.main.invoke_url}/auth/login/cpf   (CPF)
      POST ${aws_apigatewayv2_stage.main.invoke_url}/auth/refresh     (Refresh Token)
      POST ${aws_apigatewayv2_stage.main.invoke_url}/auth/logout      (Logout)

    Logs:
      Auth Handler: ${aws_cloudwatch_log_group.auth_handler.name}
      Authorizer: ${aws_cloudwatch_log_group.authorizer.name}
      API Gateway: ${aws_cloudwatch_log_group.api_gateway.name}
    ================================================================================
  EOT
}
