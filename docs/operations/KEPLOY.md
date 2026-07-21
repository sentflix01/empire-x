# Keploy Testing Guide — Empire X

Keploy auto-generates API tests by recording real traffic and replaying it.
No need to write test cases manually — just use the app and Keploy captures everything.

## Install Keploy

**macOS / Linux:**
```bash
curl --silent --location "https://github.com/keploy/keploy/releases/latest/download/keploy_linux_amd64.tar.gz" | tar xz -C /tmp
sudo mkdir -p /usr/local/bin && sudo mv /tmp/keploy /usr/local/bin
```

**Windows (via WSL or Docker):**
```bash
# Using Docker (recommended on Windows)
docker pull ghcr.io/keploy/keploy
```

## Record tests

```bash
cd backend

# Start the backend in record mode
npm run test:keploy:record

# Then use the app normally — make API calls, log in, send messages, etc.
# Keploy captures all traffic and saves test cases to ./keploy/test-sets/
# Press Ctrl+C when done recording
```

## Replay tests

```bash
cd backend

# Make sure the test database has the same seed data
DATABASE_URL=your_test_db_url npm run test:keploy:test
```

## What Keploy captures

Every HTTP request/response pair becomes a test case:
- Request: method, path, headers, body
- Response: status code, body
- DB: SQL queries and results (mocked on replay)

## Noise fields

The following fields are ignored in comparisons (they change on every request):
- `created_at`, `updated_at`, `id`, `timestamp`
- `access_token` (JWTs contain a timestamp)

## Key endpoints to record

| Priority | Endpoint | Why |
|---|---|---|
| High | `POST /api/auth/register` | Core signup flow |
| High | `POST /api/auth/login` | Core login flow |
| High | `GET /api/posts` | Feed |
| High | `POST /api/orders` | Payment flow |
| Medium | `GET /api/suggestions/people` | Friend suggestions |
| Medium | `GET /api/businesses` | Business discovery |
| Low | `GET /api/trending` | Cached, less critical |

## CI integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Run Keploy tests
  run: |
    cd backend
    npm run test:keploy:test
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
```
