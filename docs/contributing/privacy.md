# Privacy

This file tells what a service that collects visitor data must have.

[Back to CONTRIBUTING.md](../../CONTRIBUTING.md)

Code that collects data about visitors must not run without their consent.
The optional services (Umami statistics, GlitchTip error reports) start and
stop in `src/shared/consent/optional-services.ts`. They use the categories in
`src/shared/consent/consent.ts`. A new optional service must have:

- A category in `consent.ts`.
- A switch in the cookie settings (`features/consent/`).
- A paragraph in the privacy policy.
- A higher `ConsentVersion`, so that the site asks all users again.
