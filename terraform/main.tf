# =============================================================================
# FIAP Tech Challenge - Lambda API Handler Infrastructure
# =============================================================================
# Este modulo provisiona as Lambda functions para autenticacao
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Backend S3 - bucket configured dynamically via terraform init -backend-config
  backend "s3" {
    key            = "lambda-api-handler/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "fiap-terraform-locks"
  }
}

# -----------------------------------------------------------------------------
# Provider
# -----------------------------------------------------------------------------

provider "aws" {
  region = var.aws_region

  # AWS Academy: Cannot use default_tags with IAM resources (iam:TagPolicy not allowed)
  # All resources that support tags have explicit tags
  # default_tags {
  #   tags = var.common_tags
  # }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Get VPC info from kubernetes-core-infra
data "aws_vpc" "main" {
  tags = {
    Name = "${var.project_name}-vpc-${var.environment}"
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Name = "*private*"
  }
}

data "aws_security_group" "lambda_rds" {
  name = "${var.project_name}-${var.environment}-lambda-rds-sg"
}

# -----------------------------------------------------------------------------
# Locals
# -----------------------------------------------------------------------------

locals {
  function_name_prefix = "${var.project_name}-${var.environment}"

  lambda_env_vars = {
    NODE_ENV = var.environment
    # AWS_REGION is automatically provided by Lambda runtime - cannot be overridden
    DATABASE_SECRET_NAME = "${var.project_name}/${var.environment}/database/credentials"
    AUTH_SECRET_NAME     = "${var.project_name}/${var.environment}/auth/config"
  }
}
