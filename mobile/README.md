# Keyar Invoices for Android

An Expo / React Native companion app for the existing Keyar Invoice Management System. It consumes the current Django REST API and does not add or modify a backend or database.

## Requirements

- Node.js 20 LTS or newer and npm
- Expo Go for quick device testing, or Android Studio / Android SDK for a local native build
- A running Keyar backend reachable from the Android device

## Install and start

```powershell
cd mobile
npm install
Copy-Item .env.example .env
npm start
```

Set the API URL before starting Expo, or edit `mobile/.env`:

| Test target | `EXPO_PUBLIC_API_URL` |
|---|---|
| Android emulator, backend published on the same computer | `http://10.0.2.2:8000/api/` |
| Physical Android device on the same LAN | `http://<computer-LAN-IP>:8000/api/` |
| Production (APK default) | `https://keyar-invoice-api.onrender.com/api/` |

For a physical device, find the computer's LAN IP, keep the phone and computer on the same network, allow inbound traffic to the backend port in the computer firewall, and ensure Docker publishes the backend port. Do not use `localhost` in an Android device URL: it refers to the device itself. Use HTTPS for production. The app allows cleartext traffic only when the configured API URL uses HTTP; set a production URL to HTTPS.

The standalone Android app defaults to the production Render API so installed APKs do not try to load the JavaScript bundle from Metro or connect to the Android emulator. For local development, explicitly set `EXPO_PUBLIC_API_URL` to the emulator/device URL before starting Expo.
Requests allow up to 90 seconds for the first connection so a sleeping Render service can start responding after inactivity. Subsequent requests normally complete much faster.

In the Expo terminal, press `a` to open an installed Android emulator or scan the QR code with Expo Go. If the API URL changes, restart Expo and clear its cache with `npx expo start --clear`.

## Existing API integration

The app uses the Django routes and response fields implemented in `backend/config/urls.py`, `backend/invoicing/urls.py`, `views.py`, and `serializers.py`:

- `POST /api/auth/token/` and `POST /api/auth/token/refresh/` — SimpleJWT access/refresh tokens.
- `GET /api/auth/me/` — authenticated user, including `role_display` (`Admin` or `Staff`).
- `GET /api/dashboard/summary/` — counts, sales sums, monthly totals, and recent invoices.
- `/api/customers/` — list/search and customer CRUD (`name`, `address`, `gstin`, `state`, optional six-digit `pincode`, internal `state_code`, `mobile`; these text fields may be left blank and customer email is not exposed). PIN codes are shown in the app and invoice; state codes remain available internally for GSTIN and tax calculations.
- `/api/products/` — list/search and CRUD; `?active=true` filters invoice choices.
- `/api/invoices/` — invoice list/search, date filters `from` / `to`, create/edit/delete. Lines submit `product`, `quantity`, optional `rate`, and optional `gst_rate`; responses expose calculated values in `lines`.
- `GET /api/invoices/{id}/pdf/` — authenticated PDF download.
- `GET /api/settings/` and Admin-only `PATCH /api/settings/` — company settings.
- Admin-only `/api/users/` — user list/create/update/deactivate.

Access rules are enforced by the Django API. Staff may use normal invoice/customer/product operations and view settings; only Admin users can manage team members or update company settings. The backend does not currently expose payment status, so invoices are shown as issued, not paid/unpaid.

Access and refresh tokens are stored with Expo SecureStore. Authenticated calls attach the access token, refresh after a 401, and sign the user out if refresh is invalid/expired. Signing out deletes tokens from this device only; the server does not revoke refresh tokens, which remain usable until their one-day expiry if copied. Lists follow DRF pagination and pass the API's `search`, date, and active query parameters.

Customer PIN-code fields require the backend's `0002_customer_company_invoice_pincode` migration, and optional customer name/state fields require `0003_optional_customer_text_fields`. Deploy the backend changes and run `python manage.py migrate` before installing this APK. The two-digit state code remains in the API/database for GST validation and tax calculations; users enter the six-digit PIN code instead.

## Included mobile workflows

- Sign in/out and token refresh
- Dashboard summary and recent invoice navigation
- Search, add, edit, and delete customers/products
- Search/filter invoices, inspect server-calculated line/tax totals, create/edit/delete invoices
- Per-line quantity, unit price, and GST override; local CGST/SGST or interstate IGST preview
- Fetch the backend-generated PDF, save it with Android's folder picker (or iOS Files share sheet), share it, and open the native print/preview flow
- Read company settings, edit them as Admin, and manage users as Admin

## Test and check

```powershell
npm test
npx expo install --check
npx expo-doctor
npm run export
```

The calculation tests cover GST split, interstate GST, rounding, and INR formatting. API integration follows the actual backend contract; a reachable backend is needed for interactive login and CRUD testing.

## Build APK

### EAS cloud build (recommended)

Install/login to EAS CLI, set the API URL in the build environment, then run:

```powershell
npm install --global eas-cli
eas login
$env:EXPO_PUBLIC_API_URL="https://your-domain.example/api/"
eas build --platform android --profile preview
```

The `preview` profile in `eas.json` produces an installable APK and pins the Render API URL. Its release build includes the JavaScript bundle; do not install the Metro-dependent debug APK from `android/app/build/outputs/apk/debug/`. Keep the production API on HTTPS. `EXPO_PUBLIC_API_URL` is bundled into the application and is configuration, not a place for secrets.

### Local Android build

Configure Android Studio, the Android SDK, and a compatible JDK. From the `mobile/` directory, set the API URL and generate the native Android project (if it has not already been generated):

```powershell
$env:EXPO_PUBLIC_API_URL="https://keyar-invoice-api.onrender.com/api/"
npx expo prebuild --platform android --no-install
```

Then build the installable debug APK directly with Gradle:

```powershell
cd .\android
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64"
```

The standalone APK is created at `android\app\build\outputs\apk\release\app-release.apk`; the local release build uses the development signing key for installation/testing only. The listed architectures support current Android phones and x86_64 emulators. Run the same Gradle command again after code changes to rebuild it. `npx expo run:android` creates a Metro-dependent development build and is not the APK to share or sideload. For a signed production release, configure Android signing credentials through EAS or Android's secure signing setup. Do not commit keystores or signing secrets.
