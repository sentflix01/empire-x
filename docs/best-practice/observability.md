# Observability Best Practices

This guide describes how to make the system observable, debuggable, and reliable.

## Goals

- Know when production is failing
- Understand what is slow or broken
- Make debugging faster

## 1. Logging

- Use structured logs with consistent fields
- Log errors with context but avoid sensitive data
- Log important lifecycle events: startup, shutdown, critical failures

## 2. Error tracking

- Use Sentry or a similar error tracker for frontend and backend
- Capture unhandled exceptions and promise rejections
- Attach user/context metadata for important crashes

## 3. Metrics

- Track request latency and error rates
- Track business KPIs for critical features (search, cart, checkout)
- Monitor queue lengths and background job success

## 4. Alerts

- Alert on increasing error rates
- Alert on failed deployments or health check failures
- Alert on service degradation or slow responses

## 5. Dashboards

- Build dashboards for uptime, latency, and business health
- Use distributed tracing when possible for cross-service flows
- Keep dashboards focused on the most important signals

## 6. Verification

- Confirm logs appear in the chosen system
- Confirm errors are captured with useful context
- Confirm key dashboards show healthy metrics
- Add incident runbooks for common failure modes
