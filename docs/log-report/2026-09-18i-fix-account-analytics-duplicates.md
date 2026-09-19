# fix: remove duplicate Account Settings + Analytics from MY ACCOUNT nav

> **Type:** Bugfix · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## Duplicates found and removed

| Item | accountItems nav (MY ACCOUNT) | Pinned top (mobile drawer) | Settings popup | Action |
|---|---|---|---|---|
| Account Settings | ✅ was present | ✅ was pinned | ✅ keep | Removed from accountItems + removed pinned block |
| Analytics | ✅ was present | — | ✅ keep | Removed from accountItems |
| Admin Panel | ✅ removed earlier | — | ✅ keep | Already fixed in commit 70fc853 |

## What was done

1. `accountItems` array: removed `/analytics` and `/account` entries — these appear in the Settings popup on both desktop and mobile, making them redundant in the MY ACCOUNT nav section.

2. Mobile drawer: removed the pinned `Account Settings` shortcut block that appeared between the cover photo and the scrollable nav list — this was a third instance of the same link.

## Result

Each item now appears exactly once:
- MY ACCOUNT: Orders, Cart, Wallet, Referral, My Coupons, Privacy
- Settings popup: Language, Theme, Data Mode, Account Settings, Analytics, Admin Panel (admin only)
