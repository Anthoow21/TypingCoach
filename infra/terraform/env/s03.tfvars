proxmox_api_url   = "https://172.16.20.2:8006/api2/json"
proxmox_api_token = "s03@pve!terraform=d691d989-e95c-4a48-bfdc-1c46a740a802"
student_id        = "s03"
node_name         = "BO-3IL-02"
vm_template_id    = 9999
network_bridge    = "vmbr0"
datastore_id      = "local-15TB"

# IP statique sur vmbr0 — meme reseau que le Proxmox (172.16.20.2)
# Verifier que ces IPs sont libres avant d'appliquer (ping 172.16.20.35 / ping 172.16.20.36)
vm_dev_access_ip  = "172.16.20.36/24"
vm_access_ip      = "172.16.20.35/24"
vm_gateway        = "172.16.20.1"
