# fix: remove duplicate Admin Panel from desktop + mobile nav lists

> **Type:** Bugfix · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## What was done

Removed the Admin Panel nav link from the scrollable nav list in both the desktop sidebar and mobile drawer. Admin Panel is already present inside the Settings popup in both surfaces — the nav list entries were duplicates.

**Desktop sidebar:** removed `<NavLink path="/admin" ... />` block (+ its border divider) from the bottom of the nav links section.

**Mobile drawer:** removed the Admin Panel `<Link>` block (+ its border divider) from the bottom of the scrollable nav list.

Admin Panel remains accessible via Settings → Admin Panel in both desktop and mobile.
