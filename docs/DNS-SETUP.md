# DNS Setup Guide – ReinPlaner

This guide covers the DNS records required to point `dev.reinplaner.de` at your server and configure `www.reinplaner.de` as a CNAME alias.

## Records to Create

| Name | Type | Value | TTL |
|------|------|-------|-----|
| `dev.reinplaner.de` | A | `<YOUR_SERVER_IP>` | 300 |
| `www.reinplaner.de` | CNAME | `dev.reinplaner.de` | 300 |

- **A record** – points the subdomain directly to your server's IPv4 address.
- **CNAME record** – aliases `www.reinplaner.de` to `dev.reinplaner.de` so both domains serve the same content.
- **TTL 300** (5 minutes) – low value recommended during setup for fast propagation; raise to 3600+ once verified.

---

## How to Find Your Server IP

```bash
# From your server terminal
hostname -I | awk '{print $1}'

# Or query an external service
curl -s https://ifconfig.me/ip
```

If you provisioned the server on Hetzner Cloud, the IP is shown in the Hetzner Cloud Console under **Servers → your server → Overview**.

---

## Step-by-Step: Hetzner DNS

Hetzner offers a free DNS interface in the Robot panel.

1. Log in to [Hetzner Robot](https://robot.your-server.de) → **Domains** tab.
2. Select `reinplaner.de`.
3. Click **Edit DNS Settings** or the **DNS** button.
4. Add an **A record**:
   - **Name:** `dev`
   - **Type:** `A`
   - **Value:** `<YOUR_SERVER_IP>`
   - **TTL:** `300`
5. Add a **CNAME record**:
   - **Name:** `www`
   - **Type:** `CNAME`
   - **Value:** `dev.reinplaner.de`
   - **TTL:** `300`
6. Click **Save** / **Submit**.

DNS changes propagate within a few minutes up to 30 minutes due to TTL.

---

## Step-by-Step: Namecheap

1. Log in to your Namecheap account → **Dashboard** → **Domain List**.
2. Click **Manage** next to `reinplaner.de` → select the **Advanced DNS** tab.
3. Add an **A record**:
   - **Host:** `dev`
   - **Value:** `<YOUR_SERVER_IP>`
   - **Record Type:** `A`
   - **TTL:** `Automatic` (or 300)
4. Add a **CNAME record**:
   - **Host:** `www`
   - **Value:** `dev.reinplaner.de`
   - **Record Type:** `CNAME`
   - **TTL:** `Automatic`
5. Click the **green checkmark** to save each record.

---

## Step-by-Step: Cloudflare

If your domain is already managed by Cloudflare, use the Cloudflare Dashboard.

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) → select your domain.
2. Go to **DNS** → **Records**.
3. Click **Add record** and create the A record:
   - **Type:** `A`
   - **Name:** `dev`
   - **IPv4 address:** `<YOUR_SERVER_IP>`
   - **Proxy status:** `DNS only` (grey cloud) – use this while setting up to avoid proxy interference; switch to `Proxied` (orange cloud) once verified.
   - **TTL:** `Auto` (or 300)
4. Click **Add record** again and create the CNAME:
   - **Type:** `CNAME`
   - **Name:** `www`
   - **Target:** `dev.reinplaner.de`
   - **Proxy status:** same as above
   - **TTL:** `Auto`
5. Click **Save**.

> **Tip:** During initial setup set the proxy to **DNS only** so your server directly serves traffic and you can validate certificates without Cloudflare interference.

---

## Verification Commands

Run these from your local machine (or any machine outside your server) after waiting a few minutes.

### Test the A record (dev.reinplaner.de)

```bash
dig A dev.reinplaner.de +short
# Expected output: <YOUR_SERVER_IP>
```

```bash
nslookup dev.reinplaner.de
# Expected: Name: dev.reinplaner.de → Address: <YOUR_SERVER_IP>
```

### Test the CNAME (www.reinplaner.de)

```bash
dig CNAME www.reinplaner.de +short
# Expected output: dev.reinplaner.de.
```

```bash
dig A www.reinplaner.de +short
# Expected output: <YOUR_SERVER_IP>  (follows the CNAME)
```

### Full delegation check

```bash
dig NS reinplaner.de +short
# Should list your registrar's nameservers (Hetzner/Cloudflare/Namecheap)
```

### Check from multiple global locations

```bash
# Uses a public DNS checker
curl -s "https://dns.google/resolve?name=dev.reinplaner.de&type=A"
```

A result showing your server IP means the record has propagated globally.

---

## Propagation Notes

- DNS TTL of **300 seconds** means changes can take up to 5 minutes to be seen by all resolvers.
- Full global propagation can take **up to 24–48 hours** in rare cases, though 5–15 minutes is typical.
- Use `+short` in dig for clean output; omit it to see full response details including TTL and authority sections.
- If `dig` is not available, `nslookup` is pre-installed on Windows and macOS.

---

## Next Steps

Once DNS is confirmed working:

1. **Configure your web server** (nginx/Caddy) to serve the coming-soon page from `dev.reinplaner.de`.
2. **Set up TLS** – we recommend using Let's Encrypt via Certbot or Caddy's automatic HTTPS.
3. **Point production** – when ready for production, create an A record for `reinplaner.de` (apex) and update CNAMEs accordingly. Consider raising TTL to `3600` for stability.
