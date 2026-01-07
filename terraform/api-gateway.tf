# =============================================================================
# API Gateway HTTP API
# =============================================================================

# -----------------------------------------------------------------------------
# HTTP API
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "main" {
  name          = "${local.function_name_prefix}-api"
  protocol_type = "HTTP"
  description   = "FIAP Tech Challenge Auth API"

  cors_configuration {
    allow_origins     = ["*"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key"]
    expose_headers    = ["*"]
    max_age           = 3600
    allow_credentials = false
  }

  tags = var.common_tags
}

# -----------------------------------------------------------------------------
# Lambda Authorizer
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "REQUEST"
  name             = "jwt-authorizer"
  authorizer_uri   = aws_lambda_function.authorizer.invoke_arn

  authorizer_payload_format_version = "2.0"
  authorizer_result_ttl_in_seconds  = 300 # Cache authorizer results for 5 min
  enable_simple_responses           = true

  identity_sources = ["$request.header.Authorization"]
}

# -----------------------------------------------------------------------------
# Lambda Integration (Auth Handler)
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_integration" "auth_handler" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"

  integration_uri        = aws_lambda_function.auth_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# -----------------------------------------------------------------------------
# Routes - Auth Endpoints (No Authorization Required)
# -----------------------------------------------------------------------------

# POST /auth/login (email/password)
resource "aws_apigatewayv2_route" "login" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.auth_handler.id}"
}

# POST /auth/login/cpf
resource "aws_apigatewayv2_route" "login_cpf" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/login/cpf"
  target    = "integrations/${aws_apigatewayv2_integration.auth_handler.id}"
}

# POST /auth/refresh
resource "aws_apigatewayv2_route" "refresh" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/refresh"
  target    = "integrations/${aws_apigatewayv2_integration.auth_handler.id}"
}

# POST /auth/logout
resource "aws_apigatewayv2_route" "logout" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/logout"
  target    = "integrations/${aws_apigatewayv2_integration.auth_handler.id}"
}

# -----------------------------------------------------------------------------
# Stage
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.api_gateway_stage_name
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = var.api_gateway_throttling_rate_limit
    throttling_burst_limit = var.api_gateway_throttling_burst_limit
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  tags = var.common_tags
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for API Gateway
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${local.function_name_prefix}-api"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}
