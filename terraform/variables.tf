# =============================================================================
# Variables - Lambda API Handler
# =============================================================================

# -----------------------------------------------------------------------------
# AWS Configuration
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "Regiao AWS para deploy"
  type        = string
  default     = "us-east-1"
}

# -----------------------------------------------------------------------------
# Project Configuration
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Nome do projeto"
  type        = string
  default     = "fiap-tech-challenge"
}

variable "environment" {
  description = "Ambiente de deploy"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment deve ser: development, staging ou production."
  }
}

variable "common_tags" {
  description = "Tags comuns aplicadas a todos os recursos"
  type        = map(string)
  default = {
    Project   = "fiap-tech-challenge"
    Phase     = "3"
    ManagedBy = "terraform"
    Team      = "fiap-pos-grad"
  }
}

# -----------------------------------------------------------------------------
# Lambda Configuration
# -----------------------------------------------------------------------------

variable "lambda_runtime" {
  description = "Runtime do Lambda"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_memory_size" {
  description = "Memoria do Lambda em MB"
  type        = number
  default     = 256

  validation {
    condition     = var.lambda_memory_size >= 128 && var.lambda_memory_size <= 10240
    error_message = "Memory deve ser entre 128 e 10240 MB."
  }
}

variable "lambda_timeout" {
  description = "Timeout do Lambda em segundos"
  type        = number
  default     = 30

  validation {
    condition     = var.lambda_timeout >= 1 && var.lambda_timeout <= 900
    error_message = "Timeout deve ser entre 1 e 900 segundos."
  }
}

variable "lambda_reserved_concurrency" {
  description = "Concorrencia reservada do Lambda (-1 para sem limite)"
  type        = number
  default     = -1
}

# -----------------------------------------------------------------------------
# API Gateway Configuration
# -----------------------------------------------------------------------------

variable "api_gateway_stage_name" {
  description = "Nome do stage do API Gateway"
  type        = string
  default     = "v1"
}

variable "api_gateway_throttling_rate_limit" {
  description = "Rate limit do API Gateway (requests/segundo)"
  type        = number
  default     = 100
}

variable "api_gateway_throttling_burst_limit" {
  description = "Burst limit do API Gateway"
  type        = number
  default     = 200
}

# -----------------------------------------------------------------------------
# CloudWatch Configuration
# -----------------------------------------------------------------------------

variable "log_retention_days" {
  description = "Dias de retencao dos logs no CloudWatch"
  type        = number
  default     = 7

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.log_retention_days)
    error_message = "Log retention deve ser um valor valido do CloudWatch."
  }
}
