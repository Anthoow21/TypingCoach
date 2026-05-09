# ─────────────────────────────────────────────────────────────────
#  VM DEV   —  typing-coach-dev-s03
#  NIC unique (vmbr0) : IP statique 172.16.20.36/24  ← accessible PC + Ansible
# ─────────────────────────────────────────────────────────────────
resource "proxmox_virtual_environment_vm" "typing_coach_dev" {
  name      = "typing-coach-dev-${var.student_id}"
  node_name = var.node_name
  pool_id   = "students-${var.student_id}"

  on_boot             = true
  reboot_after_update = true
  scsi_hardware       = "virtio-scsi-pci"

  clone {
    vm_id   = var.vm_template_id
    full    = true
    retries = 1
  }

  cpu    { cores = 2 }
  memory { dedicated = 2048 }

  network_device { bridge = var.network_bridge }

  disk {
    datastore_id = var.datastore_id
    interface    = "scsi0"
    size         = 20
  }

  initialization {
    ip_config {
      ipv4 {
        address = var.vm_dev_access_ip
        gateway = var.vm_gateway
      }
    }
  }
}

# ─────────────────────────────────────────────────────────────────
#  VM PROD  —  typing-coach-prod-s03
#  NIC unique (vmbr0) : IP statique 172.16.20.35/24  ← accessible PC + Ansible
# ─────────────────────────────────────────────────────────────────
resource "proxmox_virtual_environment_vm" "typing_coach_prod" {
  name      = "typing-coach-prod-${var.student_id}"
  node_name = var.node_name
  pool_id   = "students-${var.student_id}"

  on_boot             = true
  reboot_after_update = true
  scsi_hardware       = "virtio-scsi-pci"

  clone {
    vm_id   = var.vm_template_id
    full    = true
    retries = 1
  }

  cpu    { cores = 2 }
  memory { dedicated = 4096 }

  network_device { bridge = var.network_bridge }

  disk {
    datastore_id = var.datastore_id
    interface    = "scsi0"
    size         = 20
  }

  initialization {
    ip_config {
      ipv4 {
        address = var.vm_access_ip
        gateway = var.vm_gateway
      }
    }
  }
}
