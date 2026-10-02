# scripts/reset-admin.js — Safe Local Admin Password Reset

## Purpose

Resets the password of one existing local admin account for development recovery.

## Safeguards

- Refuses `NODE_ENV=production`.
- Requires `ADMIN_EMAIL` to identify the exact existing admin and `ADMIN_NEW_PASSWORD` to contain 16–128 characters.
- Never creates an account, uses a default password, or prints the supplied password.
- Updates only a row that still has the `admin` role.

## Usage

Set `ADMIN_EMAIL` and `ADMIN_NEW_PASSWORD` in the local environment, then run `node scripts/reset-admin.js` from `backend/`. Do not use this utility for hosted account recovery.
