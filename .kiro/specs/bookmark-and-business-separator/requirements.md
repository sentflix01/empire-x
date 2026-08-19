# Requirements Document

## Introduction

This feature covers three UI/UX enhancements to the Nodbusiness platform:

1. **Business name separator** — When multiple business names (with their Store icons) are displayed in a post header or user profile, each business entry beyond the first is prefixed with a `|` pipe character to visually separate them.
2. **Bookmark toggle with active-state color** — The bookmark icon on Posts, Products, Showrooms, and Tasks acts as a toggle. A single click bookmarks the item and changes the icon to an amber/active color. A second click unbookmarks the item and reverts the icon to its default muted color.
3. **Real-time Bookmarks page update** — When any item is bookmarked or unbookmarked anywhere in the app, the Bookmarks page (`/bookmarks`) reflects the change immediately without a full page reload, by sharing bookmark state through a global Zustand store slice.

---

## Glossary

- **Bookmark_Button**: The `<Bookmark>` Lucide icon rendered as a clickable button on a Post, Product, Showroom, or Task card.
- **Bookmarks_Page**: The `/bookmarks` route rendered by `views/Bookmarks.tsx`, displaying saved items grouped by category tabs.
- **Bookmarks_Store**: A Zustand store slice (`bookmarksSlice`) that holds the current user's set of bookmarked item IDs, exposes toggle and hydrate actions, and is shared across all components.
- **Business_Separator**: The `|` pipe character rendered as a standalone element acting as a visual delimiter between consecutive business name entries in the post header or profile header.
- **Post_Header**: The top section of a `PostCard` component that displays the author's avatar, name, verification badge, view-mode icon, business names, and post metadata.
- **Save**: A backend record in the `saves` table with fields `user_id`, `target_id`, and `target_type` (`post` | `product` | `showroom` | `task`).
- **Toggle_Save_API**: The `POST /api/saves/toggle` endpoint that creates or deletes a Save record and returns `{ saved: boolean }`.
- **Active_Bookmark_State**: The visual state of a Bookmark_Button when `saved === true`, rendered with `fill-amber-500 text-amber-500` CSS classes.
- **Inactive_Bookmark_State**: The visual state of a Bookmark_Button when `saved === false`, rendered with `text-muted-foreground` CSS classes and no fill.

---

## Requirements

### Requirement 1: Business Name Pipe Separator

**User Story:** As a user viewing the feed, I want business names in a post header to be separated by a `|` pipe character, so that I can quickly distinguish individual business affiliations at a glance.

#### Acceptance Criteria

1. WHEN a post author has exactly one associated business and the post is displayed in personal view mode, THE Post_Header SHALL render that business name with its Store icon and no leading separator.
2. WHEN a post author has two or more associated businesses and the post is displayed in personal view mode, THE Post_Header SHALL render a `|` Business_Separator as a standalone element immediately before each business entry after the first.
3. IF two or more businesses are shown in the Post_Header, THEN each Business_Separator SHALL be rendered with `text-muted-foreground` styling so it is visually distinct from the business name text.
4. WHEN a post author has zero associated businesses and the post is displayed in personal view mode, THE Post_Header SHALL render no business name row and no Business_Separator.
5. THE Post_Header SHALL display at most two business entries, applying the pipe separator rule to only the businesses within that two-entry limit (the existing `slice(0, 2)` limit MUST be preserved).

---

### Requirement 2: Bookmark Toggle with Active-State Color — Posts

**User Story:** As a user reading the feed, I want to bookmark a post with a single click and see the icon turn amber, so that I have clear visual confirmation the post is saved.

#### Acceptance Criteria

1. WHEN a PostCard is rendered, THE Bookmark_Button SHALL query the Bookmarks_Store for the active state of the post and render in Active_Bookmark_State if saved, or Inactive_Bookmark_State if not saved.
2. WHEN a user clicks the Bookmark_Button on a post that is not yet bookmarked, THE Bookmark_Button SHALL immediately update to Active_Bookmark_State, THE Bookmarks_Store SHALL optimistically mark the post as saved, and then THE system SHALL call the Toggle_Save_API with `target_type: "post"`, confirming the final saved state from the API response.
3. WHEN a user clicks the Bookmark_Button on a post that is already bookmarked, THE Bookmark_Button SHALL immediately update to Inactive_Bookmark_State, THE Bookmarks_Store SHALL optimistically mark the post as unsaved, and then THE system SHALL call the Toggle_Save_API with `target_type: "post"`, confirming the final saved state from the API response.
4. WHILE the Toggle_Save_API call is in-flight for a post, THE Bookmark_Button SHALL be disabled to prevent duplicate requests.
5. IF the Toggle_Save_API call fails, THEN THE Bookmark_Button SHALL revert to its previous state, THE Bookmarks_Store SHALL revert the optimistic update, and THE system SHALL display an error notification to the user.
6. THE Bookmark_Button for posts SHALL be rendered and interactable in the post action bar alongside the Like and Comment buttons.

---

### Requirement 3: Bookmark Toggle with Active-State Color — Products

**User Story:** As a user browsing the marketplace, I want to bookmark a product and see the icon turn amber, so that I know the product is saved.

#### Acceptance Criteria

1. WHEN a product card or detail page is rendered, THE Bookmark_Button SHALL display in Active_Bookmark_State if the product is saved, or Inactive_Bookmark_State if not saved, based on the saved state from the Bookmarks_Store.
2. WHEN a user clicks the Bookmark_Button on a product that is not yet bookmarked, THE Bookmark_Button SHALL immediately update to Active_Bookmark_State, THE Bookmarks_Store SHALL optimistically mark the product as saved, and then THE system SHALL call the Toggle_Save_API with `target_type: "product"`.
3. WHEN a user clicks the Bookmark_Button on a product that is already bookmarked, THE Bookmark_Button SHALL immediately update to Inactive_Bookmark_State, THE Bookmarks_Store SHALL optimistically mark the product as unsaved, and then THE system SHALL call the Toggle_Save_API with `target_type: "product"`.
4. IF the Toggle_Save_API call fails, THEN THE Bookmark_Button SHALL revert to its previous visual state, THE Bookmarks_Store SHALL revert the optimistic update, and THE system SHALL display an error notification.
5. THE Bookmark_Button for products SHALL use `fill-amber-500 text-amber-500` CSS classes when active and `text-muted-foreground` with no fill when inactive — identical to the post Bookmark_Button.

---

### Requirement 4: Bookmark Toggle with Active-State Color — Showrooms

**User Story:** As a user browsing showrooms, I want to bookmark a showroom with a single click, so that I can find it again from my Bookmarks page.

#### Acceptance Criteria

1. WHEN a showroom card is rendered, THE Bookmark_Button SHALL display in Active_Bookmark_State if the showroom is saved, or Inactive_Bookmark_State if not saved, based on the saved state from the Bookmarks_Store.
2. WHEN a user clicks the Bookmark_Button on a showroom that is not yet bookmarked, THE Bookmark_Button SHALL immediately update to Active_Bookmark_State, THE Bookmarks_Store SHALL optimistically mark the showroom as saved, and then THE system SHALL call the Toggle_Save_API with `target_type: "showroom"`.
3. WHEN a user clicks the Bookmark_Button on a showroom that is already bookmarked, THE Bookmark_Button SHALL immediately update to Inactive_Bookmark_State, THE Bookmarks_Store SHALL optimistically mark the showroom as unsaved, and then THE system SHALL call the Toggle_Save_API with `target_type: "showroom"`.
4. IF the Toggle_Save_API call fails, THEN THE Bookmark_Button SHALL revert to its previous visual state, THE Bookmarks_Store SHALL revert the optimistic update, and THE system SHALL display an error notification.
5. THE Bookmark_Button for showrooms SHALL use `fill-amber-500 text-amber-500` CSS classes when active and `text-muted-foreground` with no fill when inactive — identical to the post Bookmark_Button.

---

### Requirement 5: Bookmark Toggle with Active-State Color — Tasks

**User Story:** As a user browsing tasks, I want to bookmark a task with a single click, so that I can revisit it from my Bookmarks page.

#### Acceptance Criteria

1. WHEN a task card is rendered, THE Bookmark_Button SHALL display a filled bookmark icon (Active_Bookmark_State) when the task is saved and an outline bookmark icon (Inactive_Bookmark_State) when the task is not saved, reflecting the saved state loaded from the Bookmarks_Store.
2. WHEN a user clicks the Bookmark_Button on a task, THE system SHALL immediately update the Bookmark_Button to the opposite visual state, then call the Toggle_Save_API with `target_type: "task"`, and on a successful response confirm the final saved state returned by the API.
3. IF the Toggle_Save_API call fails, THEN THE Bookmark_Button SHALL revert to the visual state it held before the click, THE Bookmarks_Store SHALL revert the optimistic update, and THE system SHALL display an error notification indicating the bookmark action could not be completed.
4. THE Bookmark_Button for tasks SHALL use the same icon component, the same `fill-amber-500 text-amber-500` filled state color, and the same `text-muted-foreground` outline state color as the Bookmark_Button on post cards.

---

### Requirement 6: Bookmarks Store (Shared Global State)

**User Story:** As a developer, I want a single source of truth for all bookmark states, so that toggling a bookmark anywhere in the app is immediately reflected everywhere without extra API calls.

#### Acceptance Criteria

1. THE Bookmarks_Store SHALL maintain a `savedIds` map (keyed by `target_id`) where each entry records `{ target_id, target_type, title, thumbnailUrl }` for a saved item, and SHALL expose an `isSaved(targetId)` selector that returns `true` if the `target_id` exists in `savedIds` and `false` otherwise.
2. THE Bookmarks_Store SHALL expose a `hydrate()` action that clears any prior `error` field, calls `GET /api/saves`, and populates `savedIds` with the current user's saves.
3. WHEN `toggleSave(targetId, targetType, itemData)` is called, THE Bookmarks_Store SHALL immediately add or remove the item from `savedIds` as an optimistic update, then call the Toggle_Save_API.
4. IF the Toggle_Save_API call within `toggleSave` fails, THEN THE Bookmarks_Store SHALL revert the optimistic change to `savedIds` and set the `error` field with the failure message.
5. WHEN the Bookmarks_Page mounts and `savedIds` is empty, THE Bookmarks_Store SHALL call `hydrate()` to ensure bookmarks are loaded on first visit.
6. IF `hydrate()` fails due to a network error, THEN THE Bookmarks_Store SHALL set an `error` field with the failure message and leave `savedIds` unchanged.

---

### Requirement 7: Real-time Bookmarks Page Update

**User Story:** As a user, I want the Bookmarks page to instantly reflect any item I bookmark or unbookmark from any other page, so that I never need to refresh the page to see my current saved items.

#### Acceptance Criteria

1. WHEN a user bookmarks an item on any page, THE Bookmarks_Page SHALL display that item under the correct category tab within the same navigation session without a page reload.
2. WHEN a user unbookmarks an item on any page (or directly from the Bookmarks_Page), THE Bookmarks_Page SHALL remove that item from its list without a page reload.
3. THE Bookmarks_Page SHALL derive its displayed list exclusively from the Bookmarks_Store `savedIds` map, rather than maintaining independent local state fetched on mount.
4. WHEN a user navigates to the Bookmarks_Page and the Bookmarks_Store is already hydrated, THE Bookmarks_Page SHALL render immediately from store data without showing a loading spinner for previously loaded items.
5. WHEN a user switches category tabs on the Bookmarks_Page, THE Bookmarks_Page SHALL filter from the in-memory Bookmarks_Store without making additional API calls.

---

### Requirement 8: Bookmark Button Accessibility

**User Story:** As a user relying on assistive technology, I want the bookmark button to be properly labeled, so that I understand its current state and purpose.

#### Acceptance Criteria

1. IF the Bookmark_Button is in Inactive_Bookmark_State, THEN the Bookmark_Button SHALL include an `aria-label` attribute whose value describes the action of adding a bookmark (e.g. `"Bookmark this post"`).
2. IF the Bookmark_Button is in Active_Bookmark_State, THEN the Bookmark_Button SHALL include an `aria-label` attribute whose value describes the action of removing the bookmark (e.g. `"Remove bookmark"`).
3. THE Bookmark_Button SHALL include an `aria-pressed` attribute set to `true` when in Active_Bookmark_State and `false` when in Inactive_Bookmark_State, updated synchronously whenever the bookmark state changes.
4. THE Bookmark_Button SHALL be reachable via sequential keyboard navigation using the Tab key.
5. WHEN a keyboard user activates the Bookmark_Button via the Enter or Space key, THE Bookmark_Button SHALL toggle its bookmark state and update `aria-label` and `aria-pressed` to reflect the new state.
6. WHILE the Bookmark_Button has keyboard focus, THE Bookmark_Button SHALL display a visible focus indicator.
