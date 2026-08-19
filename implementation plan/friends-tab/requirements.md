# Requirements Document

## Introduction

This feature adds two enhancements to Nodbusiness, the global global superapp:

1. **Friends Tab** — A dedicated `/friends` page reachable from a new "Friends" sidebar navigation entry (positioned after "Explore"). The page shows three sections — My Friends (people the current user follows), Friend Suggestions (new people to follow), and Mutual Friends (people who follow back or share mutual connections) — each displaying up to 5 user cards initially with a "More" button to expand to all results. Each card shows avatar, name, headline, and a Follow/Unfollow button.

2. **Collapsible Search Results** — In the Search page (`/search`), every result section (People, Products, Showrooms, Tasks, Posts, Jobs, Events) shows only the first 5 results on load. A "More" button at the bottom of each section expands it inline to show all results up to the existing 20-result limit returned by the backend.

The backend is Node.js/Express with PostgreSQL. The frontend is Next.js 16 with TailwindCSS/shadcn/ui. Existing relevant APIs: `GET /api/suggestions/people` (returns up to 20 suggestions), `GET /api/profiles/me/follows` (returns followed user IDs), `POST /api/profiles/follow/:userId` (follow/unfollow toggle), `follows` table with `follower_id` and `followed_id` columns.

---

## Glossary

- **System**: The Nodbusiness backend API and frontend application collectively.
- **Friends_Page**: The frontend page rendered at the `/friends` route.
- **Friends_Tab**: The navigation entry in the left sidebar that links to the Friends_Page.
- **My_Friends_Section**: The portion of the Friends_Page listing users the Current_User follows.
- **Friend_Suggestions_Section**: The portion of the Friends_Page listing users recommended for the Current_User to follow.
- **Mutual_Friends_Section**: The portion of the Friends_Page listing users who follow the Current_User back or share at least one mutual connection.
- **Current_User**: The authenticated user currently using the application.
- **User_Card**: A UI element showing a user's avatar, display name, headline, and a Follow/Unfollow button.
- **Follow_Toggle**: The action of following a user the Current_User does not yet follow, or unfollowing a user the Current_User already follows.
- **Search_Section**: A named result group within the `/search` page (People, Products, Showrooms, Tasks, Posts, Jobs, Events).
- **Collapsed_State**: The state of a Search_Section or Friends_Page section where only the first 5 items are visible.
- **Expanded_State**: The state of a Search_Section or Friends_Page section where all available items are visible.
- **Follows_API**: `GET /api/profiles/me/follows` — returns the list of user IDs the Current_User follows.
- **Suggestions_API**: `GET /api/suggestions/people` — returns up to 20 scored friend suggestions.
- **Follow_API**: `POST /api/profiles/follow/:userId` — toggles follow status for a target user.
- **Mutual_Friends_API**: `GET /api/friends/mutual` — returns users who follow the Current_User back or share mutual connections.

---

## Requirements

### Requirement 1: Friends Tab Navigation Entry

**User Story:** As a registered user, I want a "Friends" tab in the left sidebar, so that I can navigate to the Friends page from anywhere in the app.

#### Acceptance Criteria

1. THE System SHALL render a "Friends" navigation link in the left sidebar, positioned immediately after the "Explore" entry.
2. WHEN the Current_User is on the `/friends` path, THE System SHALL render the Friends_Tab link in the active/highlighted state; WHEN the Current_User is on any other path, THE System SHALL render the Friends_Tab in its default (inactive) state.
3. THE System SHALL include the Friends_Tab in both the desktop sidebar and the mobile drawer navigation menu; WHERE one context has a technical constraint, THE System SHALL render the Friends_Tab in the remaining available context.
4. WHEN the sidebar is in collapsed mode, THE System SHALL display the Friends_Tab as an icon-only entry with a tooltip showing the label "Friends".

---

### Requirement 2: Friends Page — My Friends Section

**User Story:** As a registered user, I want to see a list of people I follow in the Friends page, so that I can review and manage my connections in one place.

#### Acceptance Criteria

1. WHEN the Current_User navigates to `/friends`, THE System SHALL fetch the full list of followed users via the Follows_API and display them in the My_Friends_Section.
2. WHEN the Follows_API response has been received and all follow states are initialized, THE System SHALL render each followed user as a User_Card containing avatar (or initials fallback), display name, headline, and an "Unfollow" button.
3. WHEN the My_Friends_Section has more than 5 users, THE System SHALL display the first 5 users in Collapsed_State and render a "More" button below the list.
4. WHEN the Current_User clicks the "More" button in the My_Friends_Section, THE System SHALL transition to Expanded_State and display all users in that section without a page reload.
5. WHEN the Current_User clicks "Unfollow" on a User_Card, THE System SHALL call the Follow_API, immediately update the button to "Follow" with no delay, and decrement the visible count.
6. IF the My_Friends_Section has no users, THEN THE System SHALL display an empty-state message: "You are not following anyone yet."
7. WHILE the My_Friends_Section data is loading, THE System SHALL display skeleton placeholder cards.

---

### Requirement 3: Friends Page — Friend Suggestions Section

**User Story:** As a registered user, I want to see suggested people to follow in the Friends page, so that I can discover relevant connections without going to the Explore tab.

#### Acceptance Criteria

1. WHEN the Current_User navigates to `/friends`, THE System SHALL fetch suggestions via the Suggestions_API and display them in the Friend_Suggestions_Section.
2. THE System SHALL render each suggestion as a User_Card containing avatar (or initials fallback), display name, headline, and a "Follow" button.
3. WHEN the Friend_Suggestions_Section has more than 5 suggestions, THE System SHALL display only the first 5 in Collapsed_State and render a "More" button below the list.
4. WHEN the Current_User clicks the "More" button in the Friend_Suggestions_Section, THE System SHALL transition to Expanded_State and display all suggestions without a page reload.
5. WHEN the Current_User clicks "Follow" on a suggestion User_Card, THE System SHALL call the Follow_API, immediately update the button to "Following" with no delay, and remove the card from the suggestions list.
6. IF the Friend_Suggestions_Section returns no suggestions AND no API error occurred, THEN THE System SHALL display an empty-state message: "No new suggestions right now."
7. WHILE the Friend_Suggestions_Section data is loading, THE System SHALL display skeleton placeholder cards.
8. IF the Suggestions_API returns an error, THEN THE System SHALL display a non-blocking inline error message and SHALL NOT display the empty-state message.

---

### Requirement 4: Friends Page — Mutual Friends Section

**User Story:** As a registered user, I want to see people who follow me back or share mutual connections, so that I can identify my strongest network ties.

#### Acceptance Criteria

1. WHEN the Current_User navigates to `/friends`, THE System SHALL fetch mutual friends data via the Mutual_Friends_API and display them in the Mutual_Friends_Section.
2. THE Mutual_Friends_API SHALL return users who either: (a) follow the Current_User back (i.e., the Current_User follows them AND they follow the Current_User), or (b) share at least one mutual connection with the Current_User (common followed user), regardless of whether they directly follow each other.
3. WHEN the Follows_API response has been received and all follow states are initialized, THE System SHALL render each mutual friend as a User_Card containing avatar (or initials fallback), display name, headline, and a Follow/Unfollow button reflecting the current follow status.
4. WHEN the Mutual_Friends_Section has more than 5 users, THE System SHALL display the first 5 users in Collapsed_State and render a "More" button below the list.
5. WHEN the Current_User clicks the "More" button in the Mutual_Friends_Section, THE System SHALL transition to Expanded_State and display all mutual friends without a page reload.
6. IF the Mutual_Friends_Section has no users, THEN THE System SHALL display an empty-state message: "No mutual friends yet."
7. WHILE the Mutual_Friends_Section data is loading, THE System SHALL display skeleton placeholder cards.
8. THE Mutual_Friends_API SHALL return at most 50 mutual friend records per request.

---

### Requirement 5: Friends Page — Backend Mutual Friends Endpoint

**User Story:** As the backend system, I want a dedicated endpoint to return mutual friends, so that the Friends page can populate the Mutual Friends section without complex client-side logic.

#### Acceptance Criteria

1. THE System SHALL expose `GET /api/friends/mutual` as an authenticated endpoint that returns mutual friend records for the Current_User.
2. WHEN the Current_User calls `GET /api/friends/mutual`, THE System SHALL return users matching either of these conditions: (a) the target follows the Current_User AND the Current_User follows the target, or (b) the target and the Current_User share at least one common followed user.
3. THE System SHALL exclude the Current_User themselves from the Mutual_Friends_API response.
4. THE System SHALL include `user_id`, `display_name`, `avatar_url`, `headline`, `is_following` (whether the Current_User currently follows this user), and `mutual_count` in each record returned by the Mutual_Friends_API.
5. THE Mutual_Friends_API SHALL return results ordered by mutual_count descending, then by display_name ascending as a tiebreaker.
6. THE Mutual_Friends_API SHALL return at most 50 records.
7. IF the Current_User is not authenticated, THEN THE System SHALL return HTTP 401 for `GET /api/friends/mutual`.

---

### Requirement 6: Search Results Collapsed/Expanded Sections

**User Story:** As a user searching for content, I want each result section to show only 5 results initially with a "More" button to expand, so that the search page is less overwhelming and I can focus on the sections I care about.

#### Acceptance Criteria

1. WHEN a Search_Section contains results, THE System SHALL render only the first 5 results in Collapsed_State by default.
2. WHEN a Search_Section contains 5 or fewer results, THE System SHALL render all results and SHALL NOT display a "More" button.
3. WHEN a Search_Section contains more than 5 results, THE System SHALL display a "More" button below the first 5 results indicating how many additional results are available (e.g., "Show 15 more").
4. WHEN the Current_User clicks the "More" button for a Search_Section, THE System SHALL transition that section to Expanded_State and display all results returned by the backend (up to 20).
5. WHEN a Search_Section is in Expanded_State, THE System SHALL display a "Show less" button that transitions the section back to Collapsed_State.
6. THE System SHALL manage the expanded/collapsed state of each Search_Section independently so that expanding one section does not affect the state of other sections.
7. WHEN the search query changes, THE System SHALL reset all Search_Sections to Collapsed_State.
8. WHEN the active tab changes in the Search page, THE System SHALL reset all Search_Sections to Collapsed_State.

---

### Requirement 7: User Card Follow/Unfollow Consistency

**User Story:** As a user interacting with follow buttons across the Friends page, I want the follow state to be accurate and consistent, so that I don't accidentally follow or unfollow someone due to stale UI state.

#### Acceptance Criteria

1. WHEN the Friends_Page loads, THE System SHALL fetch the Current_User's current follows list via the Follows_API and use it to initialize the follow button state on all User_Cards.
2. WHEN the Current_User follows a user via a User_Card button, THE System SHALL immediately reflect the "Following" state on that card with no visual delay before the API call completes.
3. WHEN the Current_User unfollows a user via a User_Card button, THE System SHALL immediately reflect the "Follow" state on that card with no visual delay before the API call completes.
4. IF a follow or unfollow API call fails, THEN THE System SHALL revert the optimistic UI update on the affected card and display a non-blocking error toast.
