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

variable "google_maps_api_key" {
  type        = string
  description = "Browser key restricted to the CloudFront domain. Keep empty until Google Maps is configured."
  default     = ""
  sensitive   = true
}

variable "google_maps_map_id" {
  type        = string
  description = "Google Maps map ID for Advanced Markers. DEMO_MAP_ID is used if this remains empty."
  default     = ""
}
