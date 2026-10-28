# Meeting room booking

A single-page app for booking a meeting room. This is a draft made in about 6 hours. It is built with React, TypeScript, and Vite.

## Architecture

The code is split into three layers:

- **domain** — booking rules, date helpers, and validation
- **ui** — the page, booking list, form, and related components
- **services** — a mocked server adapter that stands in for a real API

The adapter keeps bookings in memory. They reset when the page is reloaded. There is no real backend.

## Features

- See bookings for today or a selected future day
- Add a new booking, or edit and delete an existing one, from a modal form
- Optional booking title
- Validation before a booking is saved:
  - the date and start time are not in the past
  - the slot is inside working hours, 09:00–18:00
  - the duration is between 30 minutes and 2 hours
  - the slot does not overlap another booking that day
- A mocked server adapter for create, read, update, and delete

## How I worked on it

I built the app in this order:

1. A basic UI
2. Mock CRUD methods
3. Validation logic
4. A mock server adapter

## Planned, not done

These were in the plan and are not finished yet:

- Disable buttons for past bookings
- Fix tests and refactor, especially the server adapter and the bookings module
- Check accessibility
- Styles for errors and success messages

## How to run

Install dependencies, then start the dev server:

```bash
npm install
npm run dev
```

Or open the deployed app on GitHub Pages: https://urchifox.github.io/meeting-room-booking/

Run the tests with:

```bash
npm test
```

## Chat with Cursor

You can review the correspondence with the Cursor AI agent in [`cursorChat.md`](cursorChat.md). That file combines the exported chats in chronological order, from the first UI components through form state, TypeScript fixes, the time range change, date and time validation, and the booking modal flow.