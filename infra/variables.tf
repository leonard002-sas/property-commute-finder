variable "aws_region" {
  type    = string
  default = "ap-northeast-1"
}

variable "project_name" {
  type    = string
  default = "property-commute-finder"
}

variable "github_repository" {
  type        = string
  description = "GitHub repository in owner/repository form"
  default     = "leonard002-sas/property-commute-finder"
}

variable "github_branch" {
  type    = string
  default = "main"
}
