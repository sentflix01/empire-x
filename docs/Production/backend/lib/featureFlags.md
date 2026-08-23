# lib/featureFlags.ts - Runtime Feature Flags

## 1. What is this?

**Shared frontend library.** Single registry powering rollouts (docs/product/FEATURE_FLAGS.md).

## 2. Why does it exist?

Single registry powering rollouts (docs/product/FEATURE_FLAGS.md). Priority: env FF_<NAME> > Redis ff:<name> (live flips) > hardcoded DEFAULT_FLAGS (20 flags). Percentage rollouts hash userId deterministically. Exports isEnabled(flag,userId?), getAllFlags() (admin), setFlag() via Redis. Connects: checkout gates in orders/wallet, flags route, admin panel.

## 3. What does it do?

Single registry powering rollouts (docs/product/FEATURE_FLAGS.md). Priority: env FF_<NAME> > Redis ff:<name> (live flips) > hardcoded DEFAULT_FLAGS (20 flags). Percentage rollouts hash userId deterministically. Exports isEnabled(flag,userId?), getAllFlags() (admin), setFlag() via Redis. Connects: checkout gates in orders/wallet, flags route, admin panel.

## 4. What does it touch?

Inline references only — nothing external.
