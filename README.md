# JUJ4 Shopping App

JUJ4 is a premium e-commerce storefront built with **Next.js 16**, **React 19**, **TypeScript**, and **Firebase**.

## What It Includes

- Public storefront with a branded landing page
- Product catalog with filtering, sorting, and grid/list views
- Product detail pages
- Shopping cart and checkout flows
- Email/password and Google authentication
- Firestore-backed product, cart, and user data
- Admin area for product management

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Firebase Auth
- Cloud Firestore
- Firebase Storage
- Tailwind CSS 4

## Project Structure

- `src/app` - application routes and pages
- `src/components` - shared UI components
- `src/lib` - Firebase setup and API helpers
- `src/types` - Firestore and domain types
- `firestore.rules` - Firestore security rules
- `Client/` - legacy static frontend assets kept in the repository

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up Firebase environment variables in `.env.local`.

3. Run the development server:

```bash
npm run dev
```

## Notes

- Product data is loaded from Firestore when available.
- If Firestore returns no products, the app falls back to local seed data in `src/lib/data/products-data.ts`.
- Anonymous cart items are stored locally and can be synced after sign-in.
