# Bugfix Requirements Document

## Introduction

The Nodbusiness app has a fully functional reviews backend (`/api/reviews`) with routes for fetching, creating, and deleting product reviews — including automatic average rating recalculation and duplicate prevention (one review per user per product via a unique constraint). However, the frontend `ProductDetail` page exposes none of this functionality. Users cannot see existing reviews, submit a star rating, write a comment, or view an average rating sourced from actual review data. The bug condition is: a product has a reviews API surface that exists and is ready to consume, but users encounter a completely blank reviews section on every product page.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user visits any product detail page THEN the system displays no reviews section, showing zero reviews even when reviews exist in the database

1.2 WHEN an authenticated user wants to rate or review a product THEN the system provides no form, star selector, or submission mechanism on the product page

1.3 WHEN a product has an `average_rating` and `review_count` stored in the database THEN the system only shows the raw average_rating text in the metadata row with no visual star representation and no review count

1.4 WHEN a user has already submitted a review for a product THEN the system gives no indication of their existing review and allows no way to edit it

1.5 WHEN the product owner views their own product detail page THEN the system shows no review summary that would help them understand customer sentiment

### Expected Behavior (Correct)

2.1 WHEN a user visits a product detail page THEN the system SHALL display a "Reviews" section below the product details, listing all existing reviews with reviewer name, star rating (1–5), date, and comment text

2.2 WHEN an authenticated user visits a product detail page for a product they have not yet reviewed THEN the system SHALL display a review submission form with an interactive 5-star selector and an optional text comment field, and a submit button

2.3 WHEN a product has reviews THEN the system SHALL display the average star rating visually (filled amber stars) alongside the review count (e.g., "4.2 ★ · 12 reviews") in the product header area

2.4 WHEN an authenticated user who has already reviewed a product visits the product detail page THEN the system SHALL pre-fill their existing rating and comment in the form, clearly labelled as "Edit your review", and allow resubmission to update it

2.5 WHEN an authenticated user submits or updates a review THEN the system SHALL POST to `/api/reviews`, refresh the review list, update the displayed average rating, and show a success toast

2.6 WHEN a user is not authenticated and visits a product detail page THEN the system SHALL display existing reviews but show a "Sign in to leave a review" prompt instead of the submission form

2.7 WHEN a user submits a review with no star rating selected THEN the system SHALL prevent submission and display a validation message indicating a rating is required

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user interacts with the Add to Cart, Wishlist, or Share buttons THEN the system SHALL CONTINUE TO handle those actions exactly as before, unaffected by the addition of the reviews section

3.2 WHEN the product image gallery and thumbnail strip are displayed THEN the system SHALL CONTINUE TO render and function identically, with no layout shift introduced by the new reviews section

3.3 WHEN the seller profile link is displayed on the product detail page THEN the system SHALL CONTINUE TO navigate to the seller's profile page correctly

3.4 WHEN the product detail page loads THEN the system SHALL CONTINUE TO fetch and display product title, price, description, stock status, location, and condition without any changes to that data flow

3.5 WHEN the Marketplace grid renders product cards THEN the system SHALL CONTINUE TO display product cards as before; any average rating shown on the card SHALL use the existing `product.average_rating` field already stored on the product record
