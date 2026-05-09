variable "proxmox_api_url" {
  description = "URL de l'API Proxmox"
  type        = string
}

variable "proxmox_api_token" {
  description = "Token d'API Proxmox"
  type        = string
  sensitive   = true
}

variable "student_id" {
  description = "Identifiant de l'etudiant (ex: s03)"
  type        = string
}

variable "node_name" {
  description = "Nom du noeud Proxmox cible"
  type        = string
}

variable "vm_template_id" {
  description = "ID de la VM template a cloner"
  type        = number
}

variable "network_bridge" {
  description = "Bridge reseau principal (vmbr0)"
  type        = string
}

variable "datastore_id" {
  description = "ID du datastore Proxmox"
  type        = string
}

variable "vm_access_ip" {
  description = "IP statique de la VM prod sur vmbr0 (accessible depuis le PC et le runner CI)"
  type        = string
  # Exemple : "172.16.20.35/24" — adapter si l'IP est deja prise sur le reseau
}

variable "vm_gateway" {
  description = "Passerelle par defaut du reseau vmbr0"
  type        = string
  default     = "172.16.20.1"
}

variable "vm_dev_access_ip" {
  description = "IP statique de la VM dev sur vmbr0 (accessible depuis le PC et le runner CI)"
  type        = string
  # Exemple : "172.16.20.36/24" — adapter si l'IP est deja prise sur le reseau
}
