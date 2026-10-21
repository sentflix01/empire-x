# Page Guided Tours

## Purpose

Page Guided Tours are short, in-page walkthroughs that explain the controls a person can see on the current Nodbusiness page. They are separate from the AI assistant and do not send user input to an AI service.

## Experience

- When enabled, the guide opens on a person's first visit in that browser and shows a small card beside a highlighted page area.
- **Next** advances to the next highlighted area; **Back**, **Skip guide**, **Finish**, and Escape let the person control or close the tour.
- A persistent **Page guide** button lets people replay the current page's guide.
- Guides are available on the landing page, feed, marketplace, search, and other app pages. Page-specific descriptions are attached only to controls present in the current UI.
- The layout adapts to narrow viewports, uses touch-sized controls, and respects reduced-motion preferences. Guide text is currently provided in English and Amharic.
- Completion state is stored in local browser storage. It is not synchronized between devices or accounts.

## Availability and rollout

The feature is controlled by `page_guided_tours` in `backend/lib/featureFlags.ts` and is off by default. Enable it using `FF_PAGE_GUIDED_TOURS=true` or the existing feature flag Redis mechanism. The frontend checks only `GET /api/flags/page-guided-tours`; this public response exposes the effective boolean for this one flag and does not return the registry.

## Scope

The guide explains the currently visible interface. It does not perform actions for the user, block the page while closed, or replace onboarding inside the AI assistant. The browser/device-local completion behavior means a first visit on another browser or device can show the tour again.
