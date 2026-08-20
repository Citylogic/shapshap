# Host provision — shapshap-lon1

Condensed from `docs/step-by-step.md` §4.5. Rebuilds the box in about thirty minutes after DigitalOcean restore, or from a new droplet.

**Do not store secrets here.** `POSTGRES_PASSWORD` lives in the password manager and in `/home/deploy/shapshap/.env` (mode 600).

## Droplet

| Field    | Value                              |
| -------- | ---------------------------------- |
| Region   | London (`lon1`)                    |
| Image    | Ubuntu 24.04 LTS x64               |
| Size     | 1 vCPU / 1 GB / 25 GB              |
| Backups  | Weekly (confirm 4 copies retained) |
| IPv6     | On                                 |
| SSH key  | `~/.ssh/shapshap_ed25519.pub`      |
| Hostname | `shapshap-lon1`                    |

## Cloud Firewall (DigitalOcean, not ufw)

Inbound: TCP 22 from your IP only; TCP 80, TCP 443, UDP 443 from anywhere. No Postgres port. Outbound: defaults.

## As root

First login: `ssh -i ~/.ssh/shapshap_ed25519 root@DROPLET_IP`

### Swap (not optional on 1 GB)

```bash
apt update && apt upgrade -y
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.d/99-swap.conf
```

### Docker

```bash
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
systemctl restart docker
```

### deploy user

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### SSH hardening

Leave the root session open. Confirm `ssh shapshap` as `deploy` before closing it.

```bash
cat > /etc/ssh/sshd_config.d/99-shapshap.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin prohibit-password
KbdInteractiveAuthentication no
EOF
sshd -t && systemctl restart ssh
```

`~/.ssh/config` on the laptop:

```
Host shapshap
  HostName DROPLET_IP
  User deploy
  IdentityFile ~/.ssh/shapshap_ed25519
  IdentitiesOnly yes
```

### fail2ban, unattended upgrades, timezone

```bash
apt install -y fail2ban unattended-upgrades
systemctl enable --now fail2ban
dpkg-reconfigure -plow unattended-upgrades   # Yes

cat > /etc/apt/apt.conf.d/51shapshap-reboot <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
EOF
timedatectl set-timezone Europe/London

mkdir -p /home/deploy/shapshap
chown deploy:deploy /home/deploy/shapshap
exit
```

## As deploy

```bash
scp ops/compose.yml ops/Caddyfile shapshap:~/shapshap/
```

`.env` on the box only, never in git:

```
POSTGRES_PASSWORD=
SENTRY_DSN=
TAG=latest
```

`chmod 600 ~/shapshap/.env`

Do not `docker compose up` until GHCR has `ghcr.io/citylogic/shapshap:$TAG` (Stage 5).
