# =============================================================================
# Terraform Variables - Lambda API Handler
# =============================================================================

# -----------------------------------------------------------------------------
# AWS Configuration
# -----------------------------------------------------------------------------

aws_region = "us-east-1"

# -----------------------------------------------------------------------------
# Project Configuration
# -----------------------------------------------------------------------------

project_name = "fiap-tech-challenge"
environment  = "development"

common_tags = {
  Project   = "fiap-tech-challenge"
  Phase     = "3"
  ManagedBy = "terraform"
  Team      = "fiap-pos-grad"
}

# -----------------------------------------------------------------------------
# Lambda Configuration
# -----------------------------------------------------------------------------

lambda_runtime              = "nodejs20.x"
lambda_memory_size          = 256
lambda_timeout              = 30
lambda_reserved_concurrency = -1 # Sem limite

# -----------------------------------------------------------------------------
# API Gateway Configuration
# -----------------------------------------------------------------------------

api_gateway_stage_name             = "v1"
api_gateway_throttling_rate_limit  = 100
api_gateway_throttling_burst_limit = 200

# -----------------------------------------------------------------------------
# CloudWatch Configuration
# -----------------------------------------------------------------------------

log_retention_days = 7 # Economia para AWS Academy
