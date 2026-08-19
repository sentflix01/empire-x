# Provisional Patent Application Draft
# Patent 3: Social-Commerce Showroom Discovery Method

> **Classification:** CONFIDENTIAL — Attorney-Client Privileged
> **Status:** DRAFT — To be reviewed and filed by patent attorney
> **Priority:** HIGH — File before public launch
> **Inventor(s):** [Founder Full Legal Name], [City, Country]
> **Assignee:** Nodbusiness Technologies PLC
> **Date of Conception:** August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| USPTO | United States Patent and Trademark Office — US government patent filing body |
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| SGA | Social Graph Affinity — Nodbusiness's discovery signal measuring network engagement |
| GPS | Geographic Positioning System — satellite-based location technology (also used as variable name: GPS_score) |
| CTMS | Category Taxonomy Match Score — discovery signal measuring category interest alignment |
| TVS | Trending Velocity Score — discovery signal measuring rate-of-change in engagement |
| UI | User Interface |
| MAU | Monthly Active Users |

---

## TITLE OF INVENTION

**Method and System for Unified Business Showroom Discovery Using
Combined Social Graph, Geographic Proximity, Category Taxonomy,
and Real-Time Trending Signals**

---

## FIELD OF THE INVENTION

This invention relates to digital marketplace discovery systems,
and specifically to a method for ranking and presenting business
showrooms to users by computing a unified discovery score that
combines four heterogeneous signal types: social graph affinity,
geographic proximity, business category taxonomy matching, and
real-time social trending velocity.

---

## BACKGROUND

Existing platforms for discovering businesses and services use one or
at most two signals for ranking:

1. **Geographic proximity only** (e.g., Google Maps, Yelp, Foursquare):
   Ranks businesses primarily by distance from the user's location.
   Does not consider social connections or content engagement patterns.

2. **Social graph only** (e.g., Facebook Business, LinkedIn Company pages):
   Shows businesses that connections follow or have engaged with.
   Does not consider proximity or category interest patterns.

3. **Category browsing only** (e.g., Shopify stores, Etsy, Amazon):
   Users navigate a taxonomy to find businesses in a desired category.
   Does not personalize based on social graph or proximity.

4. **Keyword search** (e.g., all major platforms):
   User must explicitly know what to search for.
   Does not surface serendipitous discovery.

No existing platform combines all four signals — social graph, proximity,
category taxonomy, and trending velocity — into a unified discovery
score for business showrooms. This fragmentation means users miss
relevant businesses because:
- They are nearby but not in the user's social network
- They are in the user's category interest area but not trending
- They are trending among the user's connections but in an unknown location
- They match the user's category interests perfectly but have no social proof

---

## SUMMARY OF THE INVENTION

The present invention provides a method for generating a unified
discovery score for each business showroom relative to each user,
by combining four signal types:

(a) **Social Graph Affinity (SGA):** A score derived from the user's
    social connections on the platform, their engagement patterns,
    and the engagement behavior of their network with the showroom;

(b) **Geographic Proximity Score (GPS_score):** A score derived from
    the physical distance between the user's location and the business
    showroom's registered location, applying a distance decay function;

(c) **Category Taxonomy Match Score (CTMS):** A score derived from
    the alignment between the user's historical category interest profile
    and the business category taxonomy classification of the showroom;

(d) **Trending Velocity Score (TVS):** A score derived from the rate
    of change in engagement metrics for the showroom within the
    user's social network and geographic region, measuring momentum
    rather than absolute engagement volume.

The method computes a final discovery score by applying learned or
configured weights to these four components and uses the score to rank
showrooms in discovery feeds, map views, and search results.

---

## DETAILED DESCRIPTION

### 1. Signal Components

**1.1 Social Graph Affinity (SGA)**

For user U and showroom S:

```
direct_follow_score      = 1.0 if U follows S's owner, else 0
mutual_connection_score  = count(U's follows who follow S's owner) / total_follows(U)
engagement_propagation   = weighted sum of U's network's interactions with S
                           (likes, comments, saves, shares on S's content)
                           × recency_decay_factor

SGA(U, S) = w_direct × direct_follow_score
           + w_mutual × mutual_connection_score
           + w_engage × engagement_propagation
```

**1.2 Geographic Proximity Score**

```
distance(U, S)      = Haversine distance in km between U's location and S's location
proximity_score(U,S) = max(0, 1 - (distance(U,S) / max_radius_km))^decay_exponent

For users with unknown location:
  proximity_score = 0.5 (neutral — neither boosted nor penalized)
```

**1.3 Category Taxonomy Match Score**

```
user_category_profile(U) = vector of category interest weights derived from:
  - User's past engagement (views, purchases, follows per category)
  - User's profile-declared business interests
  - Implicit signals from content consumption history

showroom_category_vector(S) = one-hot or hierarchical encoding of S's
                               business category and subcategory

CTMS(U, S) = cosine_similarity(user_category_profile(U), showroom_category_vector(S))
```

**1.4 Trending Velocity Score**

```
engagement_t(S)    = total engagement on S in time window t
engagement_t-1(S)  = total engagement on S in previous window t-1

velocity(S, t)     = (engagement_t(S) - engagement_t-1(S)) / engagement_t-1(S)
                     (returns positive for growing, negative for declining)

regional_velocity  = velocity computed only within U's geographic region
network_velocity   = velocity computed only within U's social network

TVS(U, S) = α × regional_velocity(S) + β × network_velocity(U, S)
```

### 2. Unified Discovery Score

```
D(U, S) = w1 × SGA(U, S)
         + w2 × GPS_score(U, S)
         + w3 × CTMS(U, S)
         + w4 × TVS(U, S)

where w1 + w2 + w3 + w4 = 1.0
and weights are learned from user engagement feedback
```

### 3. Application Surfaces

The discovery score D(U, S) is used to rank showrooms in:

**3.1 Discovery Feed**
A personalized list of showrooms presented to the user on the platform homepage.
Showrooms with high D scores appear at the top.

**3.2 Map View (Nearby)**
When a user views the nearby map, showrooms are rendered with visual
prominence (size, z-index, label visibility) proportional to D(U, S).
Showrooms with high social affinity but farther distance may still appear
prominently if their SGA and CTMS scores are high.

**3.3 Search Results Ranking**
When a user searches for a business type or keyword, results are ranked by
a combination of text relevance and D(U, S), ensuring that socially and
categorically relevant results rank above generic keyword matches.

**3.4 "Recommended for You" Section**
A dedicated section showing the top N showrooms ranked purely by D(U, S)
with no user-initiated search.

### 4. Cold Start Handling

For new users with no social graph or engagement history:
```
SGA(U, S)  = 0 (no connections yet)
CTMS(U, S) = uniform distribution across categories (until first interactions)
TVS(U, S)  = global trending velocity (not personalized)
GPS_score  = based on registration location if provided, else neutral
```

As the user engages with content, all scores are incrementally updated.

### 5. Privacy Considerations

- Location is used only with explicit user permission
- Social graph signals use only connections the user has explicitly made
- Category interest profile is not shared with third parties
- User-specific discovery scores are not exposed via any API

---

## CLAIMS (PRELIMINARY)

1. A computer-implemented method for ranking business showrooms comprising:
   computing a social graph affinity score based on the user's social
   connections and their network's engagement with each showroom;
   computing a geographic proximity score based on the distance between
   the user's location and each showroom's location using a distance
   decay function;
   computing a category taxonomy match score based on the similarity
   between the user's historical category interest profile and the
   showroom's business category classification;
   computing a trending velocity score based on the rate of change in
   engagement metrics within the user's social network and geographic region;
   and combining the four scores using learned weights to produce a unified
   discovery score for each showroom relative to each user.

2. The method of claim 1 wherein the trending velocity score measures
   the rate of change in engagement rather than absolute engagement volume.

3. The method of claim 1 wherein geographic proximity scoring uses a
   decay function that reduces proximity scores as distance increases.

4. The method of claim 1 wherein the category taxonomy match score is
   computed using cosine similarity between a user interest vector and
   a showroom category vector.

5. The method of claim 1 wherein the unified discovery score is applied
   to rank showrooms in a geographic map view with visual prominence
   proportional to the discovery score.

6. The method of claim 1 further comprising a cold-start mechanism that
   applies global trending signals for new users lacking social graph
   or category interest history.

7. A system for business showroom discovery comprising:
   a social graph module configured to compute social affinity scores;
   a proximity module configured to compute geographic decay scores;
   a taxonomy module configured to compute category match scores;
   a trending module configured to compute engagement velocity scores;
   and a ranking engine configured to combine the four scores into a
   unified discovery score for each user-showroom pair.

---

## ABSTRACT

A method and system for ranking business showrooms for individual users
by computing a unified discovery score from four heterogeneous signal types:
social graph affinity (derived from the user's connection network and their
engagement behavior), geographic proximity (using a distance decay function),
category taxonomy match (using cosine similarity between user interest
profiles and showroom category classifications), and trending velocity
(measuring rate of change in engagement rather than absolute volume).
The unified score is applied to rank showrooms in discovery feeds, map views,
and search results, and a cold-start mechanism serves new users using global
trending signals until personalized data becomes available. This four-factor
approach is novel over existing platforms that use at most two of these
signals independently.

---

*This draft requires review by a licensed patent attorney before filing.*
*All information is confidential and proprietary to Nodbusiness Technologies.*
