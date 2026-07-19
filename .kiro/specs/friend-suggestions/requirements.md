# Requirements Document

## Introduction

This feature adds two interconnected capabilities to Empire X, the African superapp built for Ethiopia:

1. **Friend Suggestion System** — surfaces a ranked list of suggested users to follow, computed from mutual connections, shared location, and platform activity. Suggestions exclude users the requester already follows, the requester themselves, and accounts they have previously dismissed.

2. **AI-User Distinction** — formally separates AI-generated seed/demo accounts from real registered users at the data-model level and exposes that distinction in every API response and UI surface that displays user identity, so real users always know when they are looking at a demo account.

The backend is Node.js/Express with PostgreSQL (Neon). The frontend is Next.js 16 with TailwindCSS/shadcn/ui. Existing relevant tables: `users`, `user_profiles`, `follows`. Seed accounts currently carry `@empirex.test` email addresses.

---

## Glossary

- **System**: The Empire X backend API and frontend application collectively.
- **Suggestion_Engine**: The backend component that computes and ranks friend suggestions for a given user.
- **Suggestion**: A recommended user account returned by the Suggestion_Engine.
- **Real_User**: A human-registered account whose `is_seed` flag is `FALSE`.
- **Seed_User**: An AI-generated demo account whose `is_seed` flag is `TRUE`.
- **Requester**: The authenticated user asking for suggestions.
- **Mutual_Connection**: A user who both the Requester and a candidate follow.
- **Dismissed_Suggestion**: A suggestion that the Requester has explicitly rejected via the dismiss action.
- **Suggestion_Score**: A numeric rank computed from mutual connections, location proximity, and activity recency.
- **Location**: The `location` text field stored in `user_profiles`.
- **Activity_Recency**: Derived from `users.updated_at` or the last post timestamp.

---

## Requirements

### Requirement 1: AI-User Data Model Flag

**User Story:** As a platform administrator, I want seed/demo accounts to be permanently marked in the database, so that the distinction between real and AI-generated users is reliable and cannot be lost.

#### Acceptance Criteria

1. THE System SHALL add an `is_seed` boolean column (default `FALSE`, not null) to the `users` table via a non-destructive migration.
2. WHEN the seed script creates a user with an `@empirex.test` email, THE System SHALL set `is_seed = TRUE` for that user record.
3. THE System SHALL backfill `is_seed = TRUE` for all existing users whose email ends with `@empirex.test` during the migration.
4. WHEN a new user registers through the standard auth flow, THE System SHALL set `is_seed = FALSE` for that user record.
5. THE System SHALL expose `is_seed` in the user object returned by every authenticated `/api/auth/me` response.

---

### Requirement 2: AI-User API Visibility

**User Story:** As a developer integrating with the API, I want every user-facing API endpoint to include the `is_seed` field, so that client applications can render the correct indicator without making additional requests.

#### Acceptance Criteria

1. WHEN the Profiles endpoint returns a user profile, THE System SHALL include the `is_seed` value sourced from the `users` table in the response payload.
2. WHEN the Suggestion_Engine returns a list of Suggestions, THE System SHALL include `is_seed` for each suggested user in the response.
3. WHEN a search or people-listing endpoint returns user records, THE System SHALL include `is_seed` for each returned user.
4. IF a client requests a profile for a user that does not exist, THEN THE System SHALL return a 404 response with no `is_seed` field.

---

### Requirement 3: AI-User UI Badge

**User Story:** As a real user browsing the app, I want to immediately see which profiles are AI-generated demo accounts, so that I can make informed decisions about whom to follow or message.

#### Acceptance Criteria

1. WHEN the frontend renders any user avatar or display name where `is_seed` is `TRUE`, THE System SHALL display a clearly visible "Demo" badge adjacent to the display name.
2. WHEN the frontend renders a user card or profile header where `is_seed` is `FALSE`, THE System SHALL render no demo badge.
3. WHEN a Seed_User's profile page is viewed, THE System SHALL display a non-dismissible notice stating that the account is AI-generated.
4. THE System SHALL render the Demo badge using accessible markup (ARIA label: "AI-generated demo account") so that assistive technologies announce it correctly.

---

### Requirement 4: Friend Suggestion API

**User Story:** As a registered user, I want to see a list of people I might want to follow, so that I can discover relevant connections on Empire X.

#### Acceptance Criteria

1. WHEN an authenticated Requester calls `GET /api/suggestions/people`, THE Suggestion_Engine SHALL return a ranked list of exactly 20 Suggestions, truncating any additional candidates.
2. THE Suggestion_Engine SHALL exclude users the Requester already follows from the Suggestion list.
3. THE Suggestion_Engine SHALL exclude the Requester themselves from the Suggestion list.
4. THE Suggestion_Engine SHALL exclude users who have been Dismissed_Suggestions for the Requester from the Suggestion list.
5. IF the Requester has fewer than 20 candidates after scoring (due to missing mutual connections, missing location data, or missing activity data), THEN THE Suggestion_Engine SHALL supplement the list with recently joined Real_Users as fallback Suggestions up to 20 total.
6. WHEN the Suggestion list is computed, THE Suggestion_Engine SHALL include `is_seed`, `display_name`, `avatar_url`, `headline`, `location`, `follower_count`, and `mutual_count` for each Suggestion.
7. THE Suggestion_Engine SHALL rank Suggestions by Suggestion_Score in descending order.

---

### Requirement 5: Suggestion Scoring

**User Story:** As a registered user, I want suggestions to be relevant to my existing network and context, so that the recommended accounts are people I am likely to know or care about.

#### Acceptance Criteria

1. THE Suggestion_Engine SHALL compute Suggestion_Score as the sum of: mutual connection score (5 points per Mutual_Connection, capped at 50), location match score (10 points if the candidate's Location matches the Requester's Location), and activity score (5 points if the candidate has been active within the last 30 days).
2. WHEN two Suggestions have equal Suggestion_Score, THE Suggestion_Engine SHALL order them by `follower_count` descending as a tiebreaker.
3. THE Suggestion_Engine SHALL treat Seed_Users and Real_Users equivalently for scoring purposes, but SHALL surface Real_Users above Seed_Users when scores are tied at the final tiebreaker step.

---

### Requirement 6: Dismissing Suggestions

**User Story:** As a registered user, I want to dismiss a suggestion I am not interested in, so that I stop seeing that person in my suggestions.

#### Acceptance Criteria

1. WHEN an authenticated Requester calls `POST /api/suggestions/dismiss/:targetUserId`, THE System SHALL record the dismissal and return HTTP 200.
2. WHEN the Requester subsequently calls `GET /api/suggestions/people`, THE Suggestion_Engine SHALL not include the dismissed user in the returned list.
3. IF the Requester attempts to dismiss a user they have already dismissed, THEN THE System SHALL return HTTP 200 immediately without any database query or backend processing.
4. IF the Requester attempts to dismiss themselves, THEN THE System SHALL return HTTP 400 with an error message.

---

### Requirement 7: Suggestion Refresh

**User Story:** As a registered user, I want the suggestion list to reflect my current network status, so that people I have just followed are no longer suggested.

#### Acceptance Criteria

1. WHEN a Requester follows a user (including users who were previously followed, unfollowed, and re-evaluated), THE Suggestion_Engine SHALL not include that followed user in subsequent calls to `GET /api/suggestions/people`.
2. THE Suggestion_Engine SHALL recompute Suggestions on each request rather than serving a stale cached result.

---

### Requirement 8: Suggestion UI Widget

**User Story:** As a registered user, I want to see friend suggestions in the app sidebar or discovery panel, so that I can act on them without leaving my current page.

#### Acceptance Criteria

1. WHEN the authenticated frontend loads, THE System SHALL display a "People You May Know" widget containing up to 5 Suggestions fetched from the Suggestion_Engine.
2. WHEN a user clicks "Follow" on a Suggestion card, THE System SHALL call the follow endpoint, update the UI optimistically to show "Following", and remove the card from the widget.
3. WHEN a user clicks the dismiss icon on a Suggestion card, THE System SHALL call the dismiss endpoint and remove the card from the widget without a full page reload.
4. WHEN the widget's `suggestion_count` is 0, THE System SHALL show a "No more suggestions" empty state message.
5. WHEN the Suggestion API returns an error, THE System SHALL display a non-blocking error message and continue rendering the rest of the page.
