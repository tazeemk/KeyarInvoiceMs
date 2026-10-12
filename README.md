# Keyar Invoice Management

Invoice management for **Namaste SS International Pvt. Ltd.**, with a responsive React/Vite UI, Django REST API, MySQL, JWT authentication, and printable A4 GST tax invoices.

The PDF in `docs/sample-invoice.pdf` is the visual reference. The generated invoice follows its single-page boxed style: supplier and buyer blocks, invoice/vehicle/mobile metadata, ruled goods table, GST summary, amount in words, QR reference, bank information, and signature areas. The brand is Keyar; the unrelated supplier/customer details in the reference are not copied.

## Quick start (Docker)

Docker Engine and the Docker Compose plugin are the only host dependencies. Node.js, Python, and MySQL run inside containers.

1. Copy `.env.example` to `.env`.
2. Replace every `replace-with-...` value with strong unique values. Keep `DJANGO_DEBUG=False`; set `DJANGO_ALLOWED_HOSTS` to the hostnames used for deployment and `DJANGO_CORS_ALLOWED_ORIGINS` to the UI origin.
3. Run:

   ```powershell
   docker compose up --build
   ```

4. Open `http://localhost:8080`. Sign in with `DJANGO_ADMIN_USERNAME` and `cd mobile
npx expo start --android --port 8082` from `.env`.

The backend waits for the MySQL health check, applies migrations, inserts the clearly identified sample catalog/profile, creates the first administrator from the environment, collects static files, and starts Gunicorn. The first boot needs internet access to pull base images and Python/Node packages. Do not expose the development HTTP ports directly to the public internet; terminate TLS at a reverse proxy/load balancer and restrict the database port (it is not published to the host).

The initial company profile says **SAMPLE**/pending for information that has not been verified. Before issuing real invoices, an Admin must replace and verify the registered address, state/state code, GSTIN, phone/email, bank name/account/IFSC/branch, and invoice prefix under **Company settings**. The supplied Keyar logo is used in the web and Android apps and as the default logo on invoice PDFs. An optional PNG/JPEG company logo (up to 1 MB) can replace it on newly created invoice snapshots and PDFs. Historical invoices retain their original supplier/customer details.

## Android mobile app

The Expo / React Native app in [`mobile/`](./mobile/) connects to this existing Django API. See its [mobile README](./mobile/README.md) for installation, Android emulator/physical-device/production API URLs, API compatibility, tests, and APK build instructions.

## Included sample catalog

First boot creates five editable demo products based on the visible reference: INDOC OA 2, Slurry, Ig Foam 5130 (50g), Citric Acid, and Caustic Soda Flakes. Sample rates, units, sizes, colours, HSN codes, and 18% GST defaults are illustrative and must be checked before commercial use. Edit the catalog in **Products**; GST rates are configurable per product.

## Features and access

- Admin and Staff accounts; Django password hashing; JWT access/refresh tokens. Signing out clears tokens from that client only; refresh tokens are not revoked server-side and remain usable until they expire.
- Role-protected team management and company settings. Staff can manage invoices, customers, and products.
- Dashboard revenue/invoice summaries and recent activity.
- Customer and product CRUD with search; invoice search and date filters.
- Automatic fiscal-year invoice numbering; invoice create/edit/delete; line-item quantities/rates; server-authoritative taxable, CGST/SGST or IGST, grand-total, and Indian amount-in-words calculations.
- Same supplier/customer state code uses CGST + SGST; different state codes use IGST. The invoice retains its original party/company details for audit integrity.
- PDF download and browser print; company logo, invoice metadata, bank details, customer signature, and authorised-signatory sections.
- Input validation, pagination, loading states, accessible form labels, health checks, and persistent MySQL volume.

## Configuration

See `.env.example` for the supported environment variables. Never commit `.env` or use example credentials/secrets in production. The app intentionally fails to start without `DJANGO_SECRET_KEY` and the required database/admin environment values. Rotate database and admin passwords through the appropriate operational process.

For a reverse-proxy deployment, configure `DJANGO_ALLOWED_HOSTS` for the public host and `DJANGO_CORS_ALLOWED_ORIGINS` for the UI origin. Set a strong randomly generated Django secret, terminate TLS at a trusted proxy which forwards `X-Forwarded-Proto`, then set `DJANGO_SECURE_SSL_REDIRECT=True`, `DJANGO_SECURE_COOKIES=True`, and `DJANGO_HSTS_SECONDS=31536000`. Do not enable HSTS until HTTPS is working for the domain and all its subdomains. Protect backups and restrict access to the Docker daemon and database volume.

## Tests and useful commands

Backend tests use Django's test runner and an isolated SQLite database. Clear the Compose-only MySQL host for the test process so the test runner does not need permission to create a temporary MySQL test database:

```powershell
docker compose exec backend sh -c 'unset DB_HOST; python manage.py test'
```

Frontend unit tests and production compilation run with:

```powershell
cd frontend
npm ci
npm test
npm run build
```

Use Docker for production use; the frontend container serves the Vite production build with Nginx and proxies `/api/` to Django. For local Vite development, run the backend on port 8000 and `npm run dev`; Vite proxies API requests to that backend.

Other operations:

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f db
docker compose down
```

`docker compose down` preserves the named `mysql_data` volume. **Do not** add `-v` unless you intentionally want to delete the database.

## Backup and restore

Create a consistent logical MySQL dump and keep it encrypted in access-controlled storage. Run from PowerShell after the database is healthy:

```powershell
docker compose exec -T db sh -c 'exec mysqldump --single-transaction -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > .\keyar-backup.sql
```

Restore into the selected database (this overwrites matching table data; confirm the target and retain a separate backup first):

```powershell
Get-Content -Raw .\keyar-backup.sql | docker compose exec -T db sh -c 'exec mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

Back up the MySQL database regularly and test restores. Also retain `.env` securely outside source control; it is needed to restore the deployment configuration. The generated PDF files are reproducible from invoice records and are not stored as a separate archive by default.

## Troubleshooting

- **Compose complains about missing variables:** copy `.env.example` to `.env`, then fill in the required keys. Compose does not silently substitute production credentials.
- **Backend stays unhealthy:** inspect `docker compose logs backend db`; verify MySQL credentials/database in `.env`, wait for the database health check, and ensure the host has free disk/memory.
- **Cannot sign in:** use the configured admin username/password. The first boot creates the Admin only when both values are set; changing those variables does not reset an existing user's password. Use Django admin or an approved password-reset process for an existing account.
- **UI shows API/network errors:** confirm the backend health status and that the Nginx frontend can reach the `backend` Compose service. Keep frontend and API on the same public origin or configure the CORS origin explicitly.
- **GST totals differ:** confirm supplier and customer two-digit state codes and each product GST rate; local invoices split tax between CGST/SGST and interstate invoices apply IGST. Server totals are authoritative.
- **Database disk/restore issues:** inspect Docker volume capacity and the MySQL logs. Avoid deleting `mysql_data`; perform a verified logical restore from a protected backup instead.
- **Invoice contains sample details:** stop before sending it to a customer; an Admin must verify and save company settings, then confirm customer/product data and rates.
