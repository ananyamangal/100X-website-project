# 100x Circle website

Next.js 15 site for www.100xcircle.com with the Growth OS admin. This README currently documents the
operational pieces that live outside the app itself.

## Uptime alerts (GitHub Actions, outside Vercel)

`.github/workflows/uptime-alert.yml` checks the live site every 10 minutes from GitHub's runners and
e-mails on DOWN (repeated at most hourly) and once on RECOVERED. Setup, the secret names, testing,
maintenance mode and what to do for each alert type are in [docs/UPTIME_ALERTS.md](docs/UPTIME_ALERTS.md).
