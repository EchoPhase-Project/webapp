# 0006. Two sign-in routes in the common layout; sign-in only in the bar

- Status: Accepted
- Date: 2026-11-24

## Context

`/auth` stood apart from every other page: no rail, no `PageHeader`, and a
card that flipped between sign-in and sign-up. The route skeleton showed a
header that the page did not have, and the focus logic had no real `h1` to
land on. Once the sign-in pages shared the layout, "Log in" appeared twice
on screen: at the bottom of the rail and in the top bar.

## Decision

- Two pages, `/auth/login` and `/auth/signup`, named after their buttons.
  `/auth/login` is also where the server already redirected on a 401.
  `/auth`, `/auth?mode=signup` and `/auth/register` redirect, keeping
  `?next=`.
- Both use the common layout, start with `PageHeader`, and show the form
  centred on a patterned card.
- Signed out, the bar ends with "Log in" (flat) and "Sign up" (the main
  button); each is hidden on its own page, and a narrow phone shows only
  "Sign up". The rail has no sign-in item; empty, it does not widen on
  hover.

## Alternatives considered

- Keeping the flip card: one URL and title for two forms, and the animation
  added nothing.
- Tabs on one page: still one URL for two forms.
- Hiding the rail for signed-out visitors: their pages would look different
  from everyone else's again.
- General pages (About) in the rail: the rail is for what the user does in
  the app; general pages stay in the footer, as in most apps with a side
  rail.

## Consequences

- Each form has its own title, URL and browser history entry.
- The paths live in one place (`LOGIN_PATH`, `SIGNUP_PATH`).
- For a signed-out visitor the rail is empty, which is accepted.
