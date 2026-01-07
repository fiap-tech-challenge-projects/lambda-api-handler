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

  backend "s3" {
    bucket         = "fiap-tech-challenge-terraform-state"
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

  default_tags {
    tags = var.common_tags
  }
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
  name = "${var.project_name}-lambda-rds-sg-${var.environment}"
}

# -----------------------------------------------------------------------------
# Locals
# -----------------------------------------------------------------------------

locals {
  function_name_prefix = "${var.project_name}-${var.environment}"

  lambda_env_vars = {
    NODE_ENV              = var.environment
    AWS_REGION            = var.aws_region
    DATABASE_SECRET_NAME  = "${var.project_name}/${var.environment}/database/credentials"
    AUTH_SECRET_NAME      = "${var.project_name}/${var.environment}/auth/config"
  }
}
