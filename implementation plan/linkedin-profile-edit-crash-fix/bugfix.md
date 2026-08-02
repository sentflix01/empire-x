# Bugfix Requirements Document

## Introduction

The profile edit page (`/profile/edit`) crashes on load with an `Uncaught ReferenceError` due to undefined icon variables used in the social links sections. The file `ProfileEdit.tsx` defines social icon stubs with an `Icon` suffix (e.g., `LinkedinIcon`, `TwitterIcon`, `InstagramIcon`, `FacebookIcon`, `YoutubeIcon`) but references them in JSX without the suffix (e.g., `Twitter`, `Instagram`, `Facebook`, `Youtube`). In production/minified builds, the bundler surfaces this as "Linkedin is not defined" (or similar), causing the entire page to crash and show "This page couldn't load".

The bug affects both the Personal tab's Social Links section and the Business tab's Social & Online Presence section.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user navigates to `/profile/edit`, THEN the system throws `Uncaught ReferenceError: Linkedin is not defined` and the page fails to render

1.2 WHEN the Social Links section renders in the Personal tab, THEN the system references undefined variables `Twitter`, `Instagram`, `Facebook`, and `Youtube` as icon components, causing a runtime crash

1.3 WHEN the Social & Online Presence section renders in the Business tab, THEN the system references undefined variables `Twitter` and `Facebook` as icon components, causing a runtime crash

1.4 WHEN the profile/edit page crashes, THEN the system displays a "This page couldn't load" error with only Reload/Back options, preventing any profile editing

### Expected Behavior (Correct)

2.1 WHEN the user navigates to `/profile/edit`, THEN the system SHALL load the page without any `ReferenceError` or runtime crash

2.2 WHEN the Social Links section renders in the Personal tab, THEN the system SHALL use the correctly defined stub icon variables (`TwitterIcon`, `InstagramIcon`, `FacebookIcon`, `YoutubeIcon`) for each social field

2.3 WHEN the Social & Online Presence section renders in the Business tab, THEN the system SHALL use the correctly defined stub icon variables (`TwitterIcon`, `FacebookIcon`) for each social field

2.4 WHEN the profile/edit page loads, THEN the system SHALL display all form fields and sections including social link inputs with their respective icons rendered without errors

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user fills in a LinkedIn URL in the Social Links section, THEN the system SHALL CONTINUE TO save and display the value correctly

3.2 WHEN the user fills in Twitter, Instagram, Facebook, or YouTube URLs, THEN the system SHALL CONTINUE TO save and display those values correctly

3.3 WHEN the user is on the Business tab and fills in social links, THEN the system SHALL CONTINUE TO save and display LinkedIn, Twitter, and Facebook URLs correctly

3.4 WHEN the user submits the profile edit form with valid data, THEN the system SHALL CONTINUE TO persist all profile fields unchanged

3.5 WHEN the profile edit page renders all other sections (Personal Info, Skills, Experience, Education, etc.), THEN the system SHALL CONTINUE TO render them correctly without any regression
