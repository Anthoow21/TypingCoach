output "typing_coach_dev_ip" {
  description = "IP de la VM dev (vmbr0 — accessible depuis le PC et le runner CI)"
  value       = split("/", var.vm_dev_access_ip)[0]
}

output "typing_coach_dev_name" {
  description = "Nom de la VM dev dans Proxmox"
  value       = proxmox_virtual_environment_vm.typing_coach_dev.name
}

output "typing_coach_prod_ip" {
  description = "IP de la VM prod (vmbr0 — accessible depuis le PC et le runner CI)"
  value       = split("/", var.vm_access_ip)[0]
}

output "typing_coach_prod_name" {
  description = "Nom de la VM prod dans Proxmox"
  value       = proxmox_virtual_environment_vm.typing_coach_prod.name
}
