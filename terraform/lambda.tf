# =============================================================================
# Lambda Functions
# =============================================================================

# -----------------------------------------------------------------------------
# Lambda Package (placeholder - built by CI/CD)
# -----------------------------------------------------------------------------

# For initial deployment, create an empty placeholder
data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/lambda_placeholder.zip"

  source {
    content  = "exports.handler = async () => ({ statusCode: 200, body: 'Placeholder' });"
    filename = "index.js"
  }
}

# -----------------------------------------------------------------------------
# Auth Handler Lambda
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "auth_handler" {
  function_name = "${local.function_name_prefix}-auth-handler"
  role          = aws_iam_role.lambda_execution.arn

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256
  handler          = "index.authHandler"
  runtime          = var.lambda_runtime

  memory_size = var.lambda_memory_size
  timeout     = var.lambda_timeout

  reserved_concurrent_executions = var.lambda_reserved_concurrency > 0 ? var.lambda_reserved_concurrency : null

  vpc_config {
    subnet_ids         = data.aws_subnets.private.ids
    security_group_ids = [data.aws_security_group.lambda_rds.id]
  }

  environment {
    variables = local.lambda_env_vars
  }

  tags = merge(var.common_tags, {
    Name = "${local.function_name_prefix}-auth-handler"
  })

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}

# -----------------------------------------------------------------------------
# Authorizer Lambda
# -----------------------------------------------------------------------------

resource "aws_lambda_function" "authorizer" {
  function_name = "${local.function_name_prefix}-authorizer"
  role          = aws_iam_role.authorizer_execution.arn

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256
  handler          = "index.authorizerHandler"
  runtime          = var.lambda_runtime

  memory_size = 128 # Authorizer needs less memory
  timeout     = 5   # Authorizer should be fast

  environment {
    variables = {
      NODE_ENV         = var.environment
      AUTH_SECRET_NAME = "${var.project_name}/${var.environment}/auth/config"
    }
  }

  tags = merge(var.common_tags, {
    Name = "${local.function_name_prefix}-authorizer"
  })

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Log Groups
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "auth_handler" {
  name              = "/aws/lambda/${aws_lambda_function.auth_handler.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "authorizer" {
  name              = "/aws/lambda/${aws_lambda_function.authorizer.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}
