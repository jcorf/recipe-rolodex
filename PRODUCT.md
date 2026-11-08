## Food Journal


# Product

## Platform

web

## Users

- Primary: the owner. One person storing/archiving their favorite recipes and restaurants. They use it mainly on their browser in their local environment.
- **Later**: other people. The owner may open the app to others eventually. Today it is single-user (one login). Who those others would be, and what they would need, is **undecided**. They may want to be able to access it on the web from their phone but currently it is locally hosted.

## Product Purpose

A personal food journal that is built on saving their favorite recipes and restaurants in one place. It focuses on aesthetics. Inspired by the functionality of letterbox’d, with a five star rating system and review system like Goodreads. 

**For the user it allows them** 

1. Link a recipe and the recipe is generated into the location. Store the original recipe link.
2. Sort through the website by cuisine.
3. To figure out a to-do of what to make. Inspire cooking and challenges the user to go through their to-do list.

## Positioning

Why this exists instead of a spreadsheet.

- **Everything is worked out in one place.** Can import recipes from IG, website, NYT, etc.
- **Self-hosted and private.** There's no subscription, the data stays on the owner's machine, and the app can be shaped to how they think.

## Operating Context

- **Occasionally, when planning:** to figure out what to cook, when to cook.
- **Running it:** locally via now.

## Capabilities and Constraints

- **Pages:** Recipes - contains all the recipes with each one represented by a cute pixel item of the recipe. Calendar - a calendar view of all the recipes/restaurants tried. “Cookbook” view - look through the recipes by ingredients (major ingredients, not spices, etc), by cuisine, rating, etc. Recipe card - place a link, and AI will grab relevant recipe details and address them. I’m not sure if AI should be a local model, etc.
- **Login:** single user. Supporting more than one user is not built yet.
- **Data: I’m not sure how this should work.**
- **Testing:** no backend test suite and almost no frontend tests. UI changes get checked by rendering them.

## Product Principles

1. The UI is fun. It should mock a recipe card book. 
2. It is easy to sort through and find recipes.

## Accessibility & Inclusion

- The owner regularly uses browser zoom. Every page must stay fully usable when zoomed in, with no content cut off or covered by the navbar.