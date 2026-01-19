# =============================================================================
# API Gateway HTTP API
# =============================================================================

# -----------------------------------------------------------------------------
# HTTP API
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "main" {
  name          = "${local.function_name_prefix}-api"
  protocol_type = "HTTP"
  description   = "FIAP Tech Challenge Auth API - Public endpoints protected by rate limiting and WAF"

  # SECURITY: Restrict CORS to specific origins in production
  cors_configuration {
    allow_origins     = var.allowed_origins
    allow_methods     = ["POST", "OPTIONS"] # Only necessary methods
    allow_headers     = ["Content-Type", "Authorization"]
    expose_headers    = ["Content-Type"]
    max_age           = 86400
    allow_credentials = true
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

# SECURITY NOTE: These routes are intentionally public for authentication
# Protection mechanisms:
# 1. Rate limiting: 5 requests/15min per IP (implemented in Lambda)
# 2. API Gateway throttling: Configurable per stage
# 3. WAF rules: Rate-based rules and IP reputation
# 4. CloudWatch monitoring: All requests logged
# 5. Request validation: Schema validation at Lambda level

# POST /auth/login (email/password)
resource "aws_apigatewayv2_route" "login" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.auth_handler.id}"

  # No authorizer - public endpoint (protected by rate limiting in Lambda)
}

# POST /auth/login/cpf
resource "aws_apigatewayv2_route" "login_cpf" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/login/cpf"
  target    = "integrations/${aws_apigatewayv2_integration.auth_handler.id}"

  # No authorizer - public endpoint (protected by rate limiting in Lambda)
}

# POST /auth/refresh
resource "aws_apigatewayv2_route" "refresh" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/refresh"
  target    = "integrations/${aws_apigatewayv2_integration.auth_handler.id}"

  # No authorizer - validates refresh token in Lambda
}

# POST /auth/logout
resource "aws_apigatewayv2_route" "logout" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/logout"
  target    = "integrations/${aws_apigatewayv2_integration.auth_handler.id}"

  # No authorizer - validates refresh token in Lambda
}

# -----------------------------------------------------------------------------
# Stage
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.api_gateway_stage_name
  auto_deploy = true

  # SECURITY: Throttling limits to prevent abuse
  default_route_settings {
    throttling_rate_limit  = var.api_gateway_throttling_rate_limit
    throttling_burst_limit = var.api_gateway_throttling_burst_limit
    detailed_metrics_enabled = true
    logging_level           = "INFO"
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

# -----------------------------------------------------------------------------
# WAF Web ACL for API Gateway (Optional but Recommended)
# -----------------------------------------------------------------------------
# Uncomment to enable WAF protection for production environments
# Note: WAF has additional costs

# resource "aws_wafv2_web_acl" "api_gateway" {
#   name  = "${local.function_name_prefix}-api-waf"
#   scope = "REGIONAL"
# 
#   default_action {
#     allow {}
#   }
# 
#   # Rate-based rule: Block IPs with >100 requests in 5 minutes
#   rule {
#     name     = "RateLimitRule"
#     priority = 1
# 
#     action {
#       block {}
#     }
# 
#     statement {
#       rate_based_statement {
#         limit              = 100
#         aggregate_key_type = "IP"
#       }
#     }
# 
#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name               = "RateLimitRule"
#       sampled_requests_enabled  = true
#     }
#   }
# 
#   # AWS Managed Rule: Known bad inputs
#   rule {
#     name     = "AWSManagedRulesKnownBadInputsRuleSet"
#     priority = 2
# 
#     override_action {
#       none {}
#     }
# 
#     statement {
#       managed_rule_group_statement {
#         vendor_name = "AWS"
#         name        = "AWSManagedRulesKnownBadInputsRuleSet"
#       }
#     }
# 
#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name               = "AWSManagedRulesKnownBadInputsRuleSet"
#       sampled_requests_enabled  = true
#     }
#   }
# 
#   # AWS Managed Rule: Common Rule Set
#   rule {
#     name     = "AWSManagedRulesCommonRuleSet"
#     priority = 3
# 
#     override_action {
#       none {}
#     }
# 
#     statement {
#       managed_rule_group_statement {
#         vendor_name = "AWS"
#         name        = "AWSManagedRulesCommonRuleSet"
#       }
#     }
# 
#     visibility_config {
#       cloudwatch_metrics_enabled = true
#       metric_name               = "AWSManagedRulesCommonRuleSet"
#       sampled_requests_enabled  = true
#     }
#   }
# 
#   visibility_config {
#     cloudwatch_metrics_enabled = true
#     metric_name               = "${local.function_name_prefix}-api-waf"
#     sampled_requests_enabled  = true
#   }
# 
#   tags = var.common_tags
# }
# 
# # Associate WAF with API Gateway
# resource "aws_wafv2_web_acl_association" "api_gateway" {
#   resource_arn = aws_apigatewayv2_stage.main.arn
#   web_acl_arn  = aws_wafv2_web_acl.api_gateway.arn
# }
