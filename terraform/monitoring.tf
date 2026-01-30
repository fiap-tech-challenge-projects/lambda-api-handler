# =============================================================================
# Security Monitoring - CloudWatch Alarms
# =============================================================================

# -----------------------------------------------------------------------------
# API Gateway Alarms
# -----------------------------------------------------------------------------

# Alarm for high 4xx error rate (potential attacks or misconfigurations)
resource "aws_cloudwatch_metric_alarm" "api_4xx_errors" {
  alarm_name          = "${local.function_name_prefix}-api-high-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "This metric monitors 4xx errors on API Gateway (potential brute force or invalid requests)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
    Stage = aws_apigatewayv2_stage.main.name
  }

  tags = var.common_tags
}

# Alarm for high 5xx error rate (backend issues)
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${local.function_name_prefix}-api-high-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "This metric monitors 5xx errors on API Gateway"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
    Stage = aws_apigatewayv2_stage.main.name
  }

  tags = var.common_tags
}

# Alarm for high request count (potential DDoS)
resource "aws_cloudwatch_metric_alarm" "api_high_request_count" {
  alarm_name          = "${local.function_name_prefix}-api-high-request-count"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Count"
  namespace           = "AWS/ApiGateway"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "This metric monitors high request count on API Gateway (potential DDoS)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
    Stage = aws_apigatewayv2_stage.main.name
  }

  tags = var.common_tags
}

# Alarm for high latency
resource "aws_cloudwatch_metric_alarm" "api_high_latency" {
  alarm_name          = "${local.function_name_prefix}-api-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300 # 5 minutes
  statistic           = "Average"
  threshold           = 2000 # 2 seconds
  alarm_description   = "This metric monitors high latency on API Gateway"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
    Stage = aws_apigatewayv2_stage.main.name
  }

  tags = var.common_tags
}

# -----------------------------------------------------------------------------
# Lambda Alarms
# -----------------------------------------------------------------------------

# Alarm for Lambda errors (auth handler)
resource "aws_cloudwatch_metric_alarm" "lambda_auth_errors" {
  alarm_name          = "${local.function_name_prefix}-auth-handler-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "This metric monitors errors in auth handler Lambda"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.auth_handler.function_name
  }

  tags = var.common_tags
}

# Alarm for Lambda throttles (auth handler)
resource "aws_cloudwatch_metric_alarm" "lambda_auth_throttles" {
  alarm_name          = "${local.function_name_prefix}-auth-handler-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This metric monitors throttles in auth handler Lambda"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.auth_handler.function_name
  }

  tags = var.common_tags
}

# Alarm for Lambda concurrent executions
resource "aws_cloudwatch_metric_alarm" "lambda_auth_concurrent" {
  alarm_name          = "${local.function_name_prefix}-auth-handler-concurrent-executions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ConcurrentExecutions"
  namespace           = "AWS/Lambda"
  period              = 60 # 1 minute
  statistic           = "Maximum"
  threshold           = 50
  alarm_description   = "This metric monitors concurrent executions in auth handler Lambda"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.auth_handler.function_name
  }

  tags = var.common_tags
}

# -----------------------------------------------------------------------------
# Custom Metrics for Security Events
# -----------------------------------------------------------------------------

# Create log metric filter for failed login attempts
resource "aws_cloudwatch_log_metric_filter" "failed_login_attempts" {
  name           = "${local.function_name_prefix}-failed-login-attempts"
  log_group_name = aws_cloudwatch_log_group.auth_handler.name
  pattern        = "[timestamp, request_id, level, msg = \"*INVALID_CREDENTIALS*\"]"

  metric_transformation {
    name      = "FailedLoginAttempts"
    namespace = "CustomAuth"
    value     = "1"
  }
}

# Alarm for high number of failed login attempts (brute force detection)
resource "aws_cloudwatch_metric_alarm" "failed_login_attempts" {
  alarm_name          = "${local.function_name_prefix}-high-failed-login-attempts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FailedLoginAttempts"
  namespace           = "CustomAuth"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 20
  alarm_description   = "This metric monitors failed login attempts (potential brute force attack)"
  treat_missing_data  = "notBreaching"

  tags = var.common_tags
}

# Create log metric filter for rate limit exceeded
resource "aws_cloudwatch_log_metric_filter" "rate_limit_exceeded" {
  name           = "${local.function_name_prefix}-rate-limit-exceeded"
  log_group_name = aws_cloudwatch_log_group.auth_handler.name
  pattern        = "[timestamp, request_id, level, msg = \"*RATE_LIMIT_EXCEEDED*\"]"

  metric_transformation {
    name      = "RateLimitExceeded"
    namespace = "CustomAuth"
    value     = "1"
  }
}

# Alarm for rate limit exceeded events
resource "aws_cloudwatch_metric_alarm" "rate_limit_exceeded" {
  alarm_name          = "${local.function_name_prefix}-rate-limit-exceeded"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RateLimitExceeded"
  namespace           = "CustomAuth"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "This metric monitors rate limit exceeded events (potential attack)"
  treat_missing_data  = "notBreaching"

  tags = var.common_tags
}
