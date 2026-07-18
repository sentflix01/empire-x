# Release Process Best Practices

This guide explains how to deploy changes safely and keep releases stable.

## Goals

- Make production releases predictable and reversible
- Reduce deployment risk
- Keep production stable while releasing new features

## 1. Branching and pull requests

- Use feature branches for each change
- Keep PRs small and focused
- Require code review before merge
- Link PRs to product and bug tickets

## 2. CI/CD workflow

- Run lint, typecheck, tests, and build on every PR
- Block merge on failing checks
- Use preview deployments for UI changes if possible

## 3. Deployment strategy

- Use incremental releases or blue/green deploys when possible
- Keep database migrations backwards-compatible
- Use feature flags for risky rollouts

## 4. Rollback plan

- Keep deployments reversible
- Tag production releases clearly
- Have a rollback procedure for failed releases

## 5. Post-release validation

- Verify critical flows after deploy (login, search, cart)
- Monitor error rate and response time for 15 minutes after release
- Confirm alerts are not firing unexpectedly

## 6. Verification

- Confirm CI deployment steps complete successfully
- Confirm that the production environment is healthy after release
- Keep a changelog or release notes for major changes
