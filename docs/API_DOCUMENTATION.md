# API Documentation

Base URLs: `/api/v1` preferred; `/api` aliases are kept for compatibility.

## Public / config

- `GET /api/config/public` — returns `{ supabaseUrl, supabaseAnonKey, supabaseOAuthEnabled, apiBaseUrl }`; publishable key only.
- `GET /api/v1/meta/locations` — Bihar district/block metadata.
- `GET /api/v1/products` — marketplace products.
- `GET /api/v1/mandi` — mandi prices.
- `GET /api/v1/schemes`, `GET /api/v1/schemes/:schemeId`
- `POST /api/v1/schemes/check-eligibility`
- `GET /api/v1/tools`
- `GET /api/v1/community/posts`
- `POST /api/v1/trace/generate`, `GET /api/v1/trace/:token`

## Auth / farmers

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google` — Firebase Google fallback token exchange
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me` — protected
- `POST /api/v1/farmers/bootstrap` — Supabase access-token farmer bootstrap
- `GET /api/v1/farmers/me` — protected
- `PUT /api/v1/farmers/me/complete-profile` — protected
- `GET /api/v1/farmers/:farmerId`, `PUT /api/v1/farmers/:farmerId` — protected
- `GET /api/v1/farmers/phone/:phone` — protected
- `GET /api/v1/admin/farmers` — admin

## Features

- `POST /api/v1/detections/upload` — optional auth, image upload + disease scan
- `GET /api/v1/detections/:detectionId`
- `GET /api/v1/detections/farmer/:farmerId`
- `POST /api/v1/sarthi/chat` — optional auth AI assistant
- `POST /api/v1/community/posts` — auth
- `POST /api/v1/tools` — auth
- `POST /api/v1/sos` — optional auth
- Admin: `GET /api/v1/admin/stats`, advisories, scheme verification

## Errors

API errors return JSON `{ success:false, error, code? }`. HTML is only served for non-API frontend routes.
