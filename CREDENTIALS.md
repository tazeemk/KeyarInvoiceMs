# Keyar Invoice App Credentials

This document lists the default local-development credentials and environment values used by the Keyar invoice application. These values are intentionally sample-only and must be replaced before any production or shared deployment.

## 1. Application Admin Login

Use these values in the UI login form for a local test setup:

- Username: `admin`
- Password: `admin`

Important:
- These credentials are only for local demo use.
- Replace them with a strong, unique admin password before deployment.
- The app creates the initial admin user only when `DJANGO_ADMIN_USERNAME` and `DJANGO_ADMIN_PASSWORD` are set in `.env`.

## 2. Environment Variables

Copy `.env.example` to `.env` and replace the placeholder values before running Docker Compose.

- `MYSQL_DATABASE=keyar`
- `MYSQL_USER=keyar`
- `MYSQL_PASSWORD=root`
- `MYSQL_ROOT_PASSWORD=root`
- `DJANGO_SECRET_KEY` is set locally in `.env`; do not copy it into this document.
- `DJANGO_ADMIN_USERNAME=admin`
- `DJANGO_ADMIN_PASSWORD=admin`
- `DJANGO_ADMIN_EMAIL=admin@gmail.com`

## 3. MySQL Database Access

For local development, the database credentials are:

- Database name: `keyar`
- Database user: `keyar`
- Database password: `root` (local development only)
- Root password: `root` (local development only)

Do not publish these values in code repositories, screenshots, or issue trackers.

## 4. Security Rules

- Keep `.env` outside version control.
- Rotate credentials before production deployment.
- The current local development passwords are intentionally weak; do not expose this setup to a public network.
- Use a strong admin password and unique database credentials.
- Restrict database and Docker access to trusted users only.

## 5. Where to Update Credentials

- App and database values are defined in `.env`
- The app bootstraps the admin account from `DJANGO_ADMIN_*` variables
- Docker Compose reads these values from the environment file

This document is for operational reference only. Replace all sample values before real use.
