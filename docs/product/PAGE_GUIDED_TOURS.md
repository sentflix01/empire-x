# Page Guided Tours

## Purpose

Page Guided Tours are short, in-page walkthroughs that explain the controls a person can see on the current Nodbusiness page. They are separate from the AI assistant and do not send user input to an AI service.

## Experience

- The **Page guide** button (in the floating assistant) starts the current page's guide at any time and shows a small card beside a highlighted page area.
- When `page_guided_tours` is on, the guide also opens by itself on a person's first visit to a page in that browser, except on the sign-in, register and password pages, where it would cover the form.
- **Next** advances to the next highlighted area; **Back**, **Skip guide**, **Finish**, and Escape let the person control or close the tour.
- A persistent **Page guide** button lets people replay the current page's guide.
- Guides are available on the landing page, feed, marketplace, search, and other app pages. Page-specific descriptions are attached only to controls present in the current UI.
- The layout adapts to narrow viewports, uses touch-sized controls, and respects reduced-motion preferences. Guide text is currently provided in English and Amharic.
- Completion state is stored in local browser storage. It is not synchronized between devices or accounts.

## Availability and rollout

The **Page guide** button always works. `page_guided_tours` in `backend/lib/featureFlags.ts` only controls whether the guide opens by itself, and is off by default (owner decision, 6 Nov 2026, audit F-031). Enable it using `FF_PAGE_GUIDED_TOURS=true` or the existing feature flag Redis mechanism. The frontend checks only `GET /api/flags/page-guided-tours`; this public response exposes the effective boolean for this one flag and does not return the registry.

## Scope

The guide explains the currently visible interface. It does not perform actions for the user, block the page while closed, or replace onboarding inside the AI assistant. The browser/device-local completion behavior means a first visit on another browser or device can show the tour again.
