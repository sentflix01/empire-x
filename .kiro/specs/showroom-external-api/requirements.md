# Requirements Document

## Introduction

The Showroom External API Integration feature allows businesses that already operate their own backend systems to connect their existing REST API endpoints to their Nodbusiness Showroom (mini-website). Instead of manually entering data into the Showroom Builder, a business can point a showroom section at their own live API, map their fields to Nodbusiness schema fields, and have their showroom reflect real-time or cached data from their own system.

The integration is designed around three core principles: **safety** (API keys and credentials never reach the browser — all requests are proxied server-side), **flexibility** (any REST API shape is supported via a field mapping UI), and **selectivity** (only explicitly mapped fields are exposed to showroom visitors; all other fields are discarded).

This feature extends the existing Showroom Builder (`frontend-next/components/showroom/BuilderForm.tsx`) and the existing showroom routes (`backend/routes/showrooms.js`) without replacing either. It introduces a new Proxy Gateway service, a Field Mapper UI, and a Health Dashboard panel.

---

## Glossary

- **Business_Owner**: An authenticated Nodbusiness user who owns one or more showrooms. Identified via the existing JWT-based `requireAuth` middleware.
- **Showroom**: An existing record in the `showrooms` PostgreSQL table, identified by `id` and `slug`, representing a business's mini-website.
- **Section**: One of the 25 configurable section types defined in `builderSections.ts` (e.g., `items`, `services`, `events`). Sections have a defined schema of fields.
- **External_Data_Source**: A configuration record storing the HTTPS URL, optional authentication method, and optional API key for a business's external REST endpoint, scoped to a single showroom section.
- **Field_Mapping**: A configuration record that maps one external API response field path (e.g., `product_name`) to one Nodbusiness section schema field (e.g., `name`) for a given External_Data_Source.
- **Proxy_Gateway**: The server-side Express middleware and route that fetches from the external URL, injects credentials, applies field mappings, and returns only mapped fields to the caller.
- **Mapped_Response**: The subset of external API data produced by applying all Field_Mappings for a section. Contains only Nodbusiness schema fields; all unmapped source fields are discarded.
- **Cache**: The existing Redis-backed caching layer (`backend/lib/redis.js`) used to store Mapped_Responses with a configurable TTL, reducing calls to external APIs.
- **Rate_Limiter**: A per-section, per-showroom request throttle enforced by the Proxy_Gateway to prevent abuse of external endpoints.
- **Health_Record**: A stored log of the last fetch attempt for each External_Data_Source, including timestamp, HTTP status code, and success or failure state.
- **Field_Mapper_UI**: The frontend panel within the Showroom Builder where a Business_Owner configures External_Data_Sources and Field_Mappings.
- **TTL**: Time-to-live in seconds; the duration a Mapped_Response remains in the Cache before the Proxy_Gateway fetches fresh data.
- **SSRF**: Server-Side Request Forgery — a class of attack where a malicious URL causes the server to make unintended internal requests.
- **Schema_Field**: A named field defined in a section's `itemFields` or top-level `fields` array in `builderSections.ts` (e.g., `name`, `price`, `desc`).

---

## Requirements

### Requirement 1: External Data Source Configuration

**User Story:** As a Business_Owner, I want to attach an external REST API URL to any of my showroom sections, so that my showroom can display live data from my own backend instead of data I typed manually.

#### Acceptance Criteria

1. THE Showroom_Builder SHALL provide an "External Data Source" option for every section that contains a `repeater` field type (i.e., `items`, `services`, `gallery`, `testimonials`, `team`, `faq`, `features`, `stats`, `portfolio`, `pricing`, `process`, `caseStudies`, `partners`, `awards`, `careers`, `industries`).
2. WHEN a Business_Owner enables the "External Data Source" option for a section, THE Field_Mapper_UI SHALL display an input for the external endpoint URL and a selector for the authentication method (`none`, `bearer_token`, `api_key_header`, `api_key_query`).
3. WHEN a Business_Owner submits an external endpoint configuration, THE Proxy_Gateway SHALL validate that the URL uses the HTTPS scheme before saving the record.
4. IF the submitted URL does not use the HTTPS scheme, THEN THE Proxy_Gateway SHALL reject the request with HTTP 422 and a descriptive error message, regardless of whether the URL passes other validation checks; THE Proxy_Gateway SHALL use HTTP 422 for all URL validation failures, including HTTPS scheme violations and any other URL validation failures.
5. WHEN a Business_Owner selects an authentication method other than `none`, THE Field_Mapper_UI SHALL display a credential input field for the API key or bearer token value; IF the credential input field is not immediately visible after an authentication method is selected, THE Field_Mapper_UI SHALL display it upon the next user interaction without requiring a page reload; IF the credential input field is not properly displayed and accessible at the time the Business_Owner attempts to save the configuration, THE Field_Mapper_UI SHALL prevent saving and SHALL display an error message until the credential input field is rendered and accessible.
6. THE System SHALL store the API key or bearer token in the database using AES-256-GCM encryption; THE System SHALL never return the plaintext credential value to any frontend client; WHEN the authentication method is `none`, THE System SHALL NOT return any credential values to the frontend client.
6. THE System SHALL store the API key or bearer token in the database using AES-256-GCM encryption; THE System SHALL never return the plaintext credential value to any frontend client.
7. THE System SHALL associate each External_Data_Source with exactly one showroom section, identified by the combination of `showroom_id` and `section_key`.
8. WHEN a Business_Owner saves an external endpoint configuration, THE System SHALL validate all fields before saving; IF any validation check fails, THE System SHALL reject the request and SHALL NOT create or replace the External_Data_Source record; THE System SHALL only return HTTP 200 or 201 when the configuration passes all validation checks.

---

### Requirement 2: SSRF and URL Security Validation

**User Story:** As a Platform_Operator, I want the Proxy_Gateway to block requests to internal network addresses and non-HTTPS URLs, so that attackers cannot use showroom integrations to probe the internal infrastructure.

#### Acceptance Criteria

1. WHEN the Proxy_Gateway resolves the hostname of an external endpoint URL, THE Proxy_Gateway SHALL reject the URL if the resolved IP address falls within any RFC-1918 private range (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), the loopback range (127.0.0.0/8), the link-local range (169.254.0.0/16), or the IPv6 loopback address (::1).
2. WHEN the Proxy_Gateway resolves the hostname of an external endpoint URL, THE Proxy_Gateway SHALL reject the URL if the hostname resolves to `localhost` or any variant thereof.
3. IF a URL fails SSRF validation at save time, THEN THE Proxy_Gateway SHALL respond with an appropriate 4xx status code and an error body indicating "blocked address"; HTTP 422 is the preferred response code, but other 4xx codes MAY be used when more semantically appropriate.
4. IF a URL passes SSRF validation at save time but resolves to a blocked address or exhibits any suspicious DNS behavior at fetch time, THEN THE Proxy_Gateway SHALL abort the outbound request regardless of whether logging succeeds or fails; THE Proxy_Gateway SHALL log incidents for all SSRF validation failures, including requests that are successfully aborted; IF the logging system is unavailable, THE Proxy_Gateway SHALL still abort the request and SHALL NOT proceed with the outbound fetch; THE Proxy_Gateway SHALL return an error response to the client for both save-time and fetch-time validation failures, with no silent handling of fetch-time SSRF failures.
5. THE Proxy_Gateway SHALL enforce SSRF validation both at configuration-save time and at fetch time.

---

### Requirement 3: Field Mapping Configuration

**User Story:** As a Business_Owner, I want to map fields from my external API's response to Nodbusiness showroom schema fields, so that my data displays correctly in my chosen section layout.

#### Acceptance Criteria

1. WHEN an External_Data_Source has been saved for a section, THE Field_Mapper_UI SHALL display a "Test & Map Fields" panel that fetches a sample response from the configured URL via the Proxy_Gateway and displays the top-level keys of the response.
2. THE Field_Mapper_UI SHALL present each Schema_Field defined for the section (from `builderSections.ts` `itemFields`) as a mapping target, with a dropdown or text input for specifying the corresponding source field path.
3. WHEN a Business_Owner saves a Field_Mapping, THE System SHALL store the mapping as a JSON object pairing `source_path` (dot-notation path into the external response object or array item) to `target_field` (a Schema_Field key for the section).
4. THE System SHALL accept one Field_Mapping entry per Schema_Field per External_Data_Source; a second mapping for the same target field SHALL replace the first.
5. WHEN the Proxy_Gateway transforms an external API response, THE Proxy_Gateway SHALL apply all saved Field_Mappings and produce a Mapped_Response containing only the mapped target fields; THE Proxy_Gateway SHALL only produce a Mapped_Response when Field_Mappings have been configured and applied; WHEN no Field_Mappings are configured, THE Proxy_Gateway SHALL NOT pass through the original external API response; THE Proxy_Gateway SHALL return a Mapped_Response whenever Field_Mappings exist, even if the proxy gateway is not actively transforming the external API response in real time, as long as the stored mappings are present.
6. IF a source path referenced in a Field_Mapping does not exist in the external response, THEN THE Proxy_Gateway SHALL omit that field from the Mapped_Response without returning an error; THE System SHOULD log or surface a UI indicator to help the Business_Owner debug missing source paths; WHEN Field_Mappings are not actively being applied, THE System MAY still log debug indicators for missing source paths.
7. THE Field_Mapper_UI SHALL allow the Business_Owner to delete any individual Field_Mapping entry.
8. THE System SHALL support dot-notation source paths for nested fields (e.g., `product.details.price`).

---

### Requirement 4: Proxy Gateway — Fetch, Transform, and Serve

**User Story:** As a Showroom_Visitor, I want the showroom sections that use an external data source to display current data, so that I see up-to-date information from the business's own system.

#### Acceptance Criteria

1. THE Proxy_Gateway SHALL expose a public endpoint `GET /api/proxy/:showroomId/:sectionKey` that Showroom_Visitors and the Showroom_Builder can call to retrieve the Mapped_Response for a section.
2. WHEN the Proxy_Gateway receives a request for a section with a valid External_Data_Source and Field_Mappings, THE Proxy_Gateway SHALL first check the Cache for a stored Mapped_Response under the key `proxy:{showroomId}:{sectionKey}`.
3. WHEN a valid Cache entry exists for a section, THE Proxy_Gateway SHALL return the cached Mapped_Response and SHALL NOT make an outbound request to the external URL.
4. WHEN no valid Cache entry exists, THE Proxy_Gateway SHALL fetch from the configured external URL, inject authentication credentials server-side, apply Field_Mappings, store the result in the Cache with the configured TTL, and return the Mapped_Response; IF the Cache lookup itself fails or the cached data is corrupted, THE Proxy_Gateway SHALL fall back to fetching fresh data from the external URL as if no Cache entry existed; WHEN applying Field_Mappings to fresh data from the external URL, THE Proxy_Gateway SHALL always apply Field_Mappings before returning the response — IF Field_Mapping application fails, THE Proxy_Gateway SHALL return an error and SHALL NOT return unmapped data.
5. THE Proxy_Gateway SHALL set a default TTL of 300 seconds (5 minutes) when no TTL is configured for the External_Data_Source.
6. THE Proxy_Gateway SHALL inject authentication credentials by: setting the `Authorization: Bearer <token>` header for `bearer_token` auth, setting the configured header name to the decrypted API key for `api_key_header` auth, or appending the key as a query parameter for `api_key_query` auth.
7. THE Proxy_Gateway SHALL NOT include any credential value in the HTTP response returned to the caller.
8. IF the external URL returns HTTP 4xx or 5xx, THEN THE Proxy_Gateway SHALL return HTTP 502 with a body `{ "error": "upstream_error", "status": <upstream_status> }`; WHEN the external URL returns HTTP 2xx, THE Proxy_Gateway SHALL return the mapped response data directly to the caller.
9. IF the outbound request to the external URL times out after 10 seconds, THEN THE Proxy_Gateway SHALL return HTTP 504 with a body `{ "error": "upstream_timeout" }`; WHEN the outbound request succeeds but takes longer than 10 seconds, THE Proxy_Gateway SHALL wait for and return the fresh successful data rather than falling back to any cached response.
10. WHEN the external response body is a JSON array, THE Proxy_Gateway SHALL treat each array element as an item and apply Field_Mappings to each element individually.
11. WHEN the external response body is a JSON object with a single array-valued key, THE Proxy_Gateway SHALL use that array as the item list and apply Field_Mappings to each element individually using the same per-element mapping logic as AC10.
12. THE Proxy_Gateway SHALL write a Health_Record on every fetch attempt, recording `showroom_id`, `section_key`, `fetched_at` (UTC timestamp), `http_status`, and `success` (boolean).

---

### Requirement 5: Rate Limiting

**User Story:** As a Platform_Operator, I want to limit how frequently the Proxy_Gateway fetches from any single external endpoint, so that showroom traffic cannot overwhelm the business's own API.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce a maximum of 1 outbound fetch per section per 60 seconds per unique caller IP address.
2. WHEN the Rate_Limiter determines that a section has reached its per-IP fetch limit, THE Proxy_Gateway SHALL return HTTP 429 with a `Retry-After` header set to exactly 60 seconds; THE Proxy_Gateway SHALL only return HTTP 429 when the specific per-IP rate limit for that section has actually been exceeded and SHALL NOT return HTTP 429 under any other condition.
3. THE Rate_Limiter SHALL use the existing Redis instance (`backend/lib/redis.js`) to store per-IP, per-section counters with a 60-second expiry.
4. WHEN the Redis instance is unavailable, THE Rate_Limiter SHALL fall back to in-memory counters to enforce rate limits; THE Rate_Limiter SHALL log a warning when operating in in-memory fallback mode; WHEN the Redis instance becomes available again after a fallback period, THE Rate_Limiter SHALL immediately switch back to using Redis for rate limit counters.
5. WHILE a valid cached Mapped_Response exists, THE Rate_Limiter SHALL NOT decrement or check fetch quotas, as no outbound request is made.

---

### Requirement 6: Configurable Cache TTL

**User Story:** As a Business_Owner, I want to control how long my showroom section's data is cached, so that I can balance freshness against the number of calls made to my API.

#### Acceptance Criteria

1. THE Field_Mapper_UI SHALL display a TTL input (in minutes) for each External_Data_Source, with a default value of 5 minutes and a selectable range of 1 minute to 1440 minutes (24 hours).
2. WHEN a Business_Owner saves a TTL value, THE System SHALL store the TTL in seconds (converted from the minute value entered) on the External_Data_Source record; THE System SHALL enforce a minimum TTL of 1 second and SHALL reject TTL values of 0.
3. THE Proxy_Gateway SHALL use the stored TTL value to set Cache expiry when storing Mapped_Responses via Redis `setex`; THE Field_Mapper_UI SHALL enforce a minimum input value of 1 minute to prevent zero-second TTL configurations; WHEN the stored TTL value is at the 1-second minimum (due to conversion from the minimum 1-minute UI input), THE Cache expiry SHALL use that 1-second value; THE Proxy_Gateway SHALL use whatever TTL value is stored in the database for Cache expiry, even if that value falls outside the 1–1440 minute range enforced by the UI.
4. IF the Business_Owner manually triggers a cache refresh from the dashboard, THEN THE System SHALL delete the Cache entry for that section and force the next visitor request to fetch fresh data from the external URL.

---

### Requirement 7: Selective Field Exposure

**User Story:** As a Business_Owner, I want to ensure that only the fields I have explicitly mapped are shown to showroom visitors, so that sensitive internal data fields from my API are never leaked.

#### Acceptance Criteria

1. THE Proxy_Gateway SHALL discard all fields from the external API response that do not correspond to a saved Field_Mapping target field.
2. THE Proxy_Gateway SHALL return only the keys present in the active Field_Mappings set for the section in the Mapped_Response.
3. IF no Field_Mappings have been saved for an External_Data_Source, THEN THE Proxy_Gateway SHALL return an empty array and SHALL NOT expose any data from the external response.
4. THE System SHALL store Field_Mappings as a server-side configuration; THE Field_Mapper_UI SHALL NOT expose the list of unmapped source fields to Showroom_Visitors.

---

### Requirement 8: Health Status Dashboard

**User Story:** As a Business_Owner, I want to see the health status of each connected external API endpoint in my Showroom dashboard, so that I can quickly identify and fix integrations that are failing.

#### Acceptance Criteria

1. THE Showroom_Builder SHALL display a "Data Source Status" panel listing each configured External_Data_Source for the current showroom, showing: section name, external URL (truncated), last-fetched timestamp, and a status indicator (`healthy`, `failing`, `never_fetched`).
2. WHEN the most recent Health_Record for a section shows `success: true`, THE System SHALL display the status as `healthy`.
3. WHEN the most recent Health_Record for a section shows `success: false`, THE System SHALL display the status as `failing` along with the HTTP status code from the upstream error; THE System SHALL strictly enforce that any Health_Record indicating failure is always displayed as `failing` and never as `healthy`; THE System SHALL implement additional validation in the status display logic to prevent incorrect `healthy` display for failed records.
4. WHEN no Health_Record exists in the database for a section's External_Data_Source, THE System SHALL display the status as `never_fetched`.
5. THE System SHALL expose a `GET /api/showrooms/:showroomId/external-sources/health` endpoint, accessible only to the authenticated Business_Owner of the showroom, that returns the latest Health_Record per section.
6. THE Showroom_Builder SHALL update the Data Source Status panel without requiring a full page reload when the Business_Owner navigates to the dashboard tab.

---

### Requirement 9: Access Control and Ownership

**User Story:** As a Platform_Operator, I want all External_Data_Source configuration endpoints to require authentication and ownership verification, so that one business cannot read or modify another business's API configuration.

#### Acceptance Criteria

1. THE System SHALL require a valid JWT (validated by the existing `requireAuth` middleware) for all endpoints by default; THE System SHALL NOT enforce JWT validation on the public proxy endpoint `GET /api/proxy/:showroomId/:sectionKey`; for any endpoint type not explicitly designated as public or protected in this spec, THE System SHALL require authentication by default.
2. WHEN a Business_Owner attempts to access, create, or modify an External_Data_Source or Field_Mapping for a showroom, THE System SHALL verify that the authenticated user's `id` matches the showroom's `owner_id` before processing the request.
3. IF the authenticated user's `id` does not match the showroom's `owner_id` and the user does not have the `admin` role, THEN THE System SHALL respond with HTTP 403.
4. THE public proxy endpoint `GET /api/proxy/:showroomId/:sectionKey` SHALL be accessible without authentication and SHALL allow requests regardless of whether the caller provides authentication credentials, as it serves data to public showroom visitors.
5. THE health endpoint `GET /api/showrooms/:showroomId/external-sources/health` SHALL require authentication and ownership verification as per criteria 1 and 2.

---

### Requirement 10: External Data Source Lifecycle Management

**User Story:** As a Business_Owner, I want to be able to disable, re-enable, or delete an external data source connection, so that I can revert to manual data entry or switch to a different API without losing my showroom content.

#### Acceptance Criteria

1. THE Field_Mapper_UI SHALL provide controls to disable (pause) and re-enable an External_Data_Source without deleting the configuration.
2. WHILE an External_Data_Source is disabled, THE Proxy_Gateway SHALL not fetch from the external URL and SHALL return an empty array for that section, ignoring any cached data or errors encountered during that operation.
3. WHILE an External_Data_Source is enabled (not disabled), THE Proxy_Gateway SHALL fetch data normally from the external URL according to the configured TTL and Field_Mappings.
4. WHILE an External_Data_Source is disabled, THE Showroom_Builder SHALL fall back to displaying the manually entered section data (from the `formData` stored in the showroom record) if any exists; IF no manual data exists for the section, THE Showroom_Builder SHALL display the section as empty; THE System SHALL always render either the manual fallback data or an empty section — no other outcome is acceptable, and no exception handling beyond this behavior is specified.
5. WHEN a Business_Owner deletes an External_Data_Source, THE System SHALL cascade-delete all associated Field_Mappings and Health_Records for that section.
6. WHEN a Business_Owner deletes an External_Data_Source, THE System SHALL delete the associated Cache entry from Redis.
7. THE Field_Mapper_UI SHALL require an explicit confirmation step before permanently deleting an External_Data_Source.

---

### Requirement 11: Data Integrity and Round-Trip Consistency

**User Story:** As a Developer, I want the field mapping transformation to be deterministic and verifiable, so that data is consistently applied across cache misses and cache hits without divergence.

#### Acceptance Criteria

1. THE Proxy_Gateway SHALL produce identical Mapped_Responses for the same external API response body and the same set of Field_Mappings, regardless of how many times the transformation is applied.
2. FOR ALL valid External_Data_Source configurations, serializing a Field_Mapping set to JSON and deserializing it SHALL produce a Field_Mapping set that generates the same Mapped_Response as the original (round-trip property).
3. THE Proxy_Gateway SHALL apply Field_Mappings in a deterministic order (alphabetical by `target_field` key) so that the Mapped_Response structure is stable across server restarts.
4. WHEN the external API response changes between two fetch cycles, THE Proxy_Gateway SHALL reflect the new data only after the Cache TTL expires and a fresh fetch actually occurs, with no stale data persisting beyond the configured TTL.
5. IF a fresh fetch occurs but the subsequent data update fails, THEN THE Proxy_Gateway SHALL return no data for that section rather than falling back to the previously cached data.

