# Auth Security Review

Last audit date: 2026-06-29

## Scope

Reviewed the custom authentication surface in this Next.js 16.2.4 / NextAuth v5 application:

- Auth.js/NextAuth configuration and route handler: `src/auth.ts`, `src/auth.config.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts`, `src/types/next-auth.d.ts`.
- Credentials, registration, email verification, forgot-password, and reset-password routes and forms: `src/app/api/auth/*`, `src/app/(auth)/*`, `src/components/auth/*`.
- Token generation, hashing, expiration, callback URL handling, and email sending: `src/lib/auth/email-verification.ts`, `src/lib/email/resend.ts`.
- Profile authorization and account mutation paths: `src/app/profile/page.tsx`, `src/app/api/profile/account/route.ts`, `src/app/api/profile/password/route.ts`, `src/lib/db/profile.ts`, `src/components/profile/profile-account-actions.tsx`.
- Persistence models for users, OAuth accounts, sessions, password hashes, and verification/reset tokens: `prisma/schema.prisma`.
- Project docs and config for deployment/rate-limit assumptions: `README.md`, `context/`, `next.config.ts`, `AGENTS.md`.

Local framework docs reviewed before making Next.js-specific claims:

- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- `node_modules/next/dist/docs/01-app/02-guides/redirecting.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`

## Findings

### Critical

**Issue**: Password reset emails trust the request-derived origin
**File**: `src/app/api/auth/forgot-password/route.ts`
**Line(s)**: 48-55
**Severity**: Critical

**Evidence**:
```ts
const passwordResetToken = await createPasswordResetToken(email);
const resetUrl = createPasswordResetUrl({
  callbackUrl,
  email,
  origin: new URL(request.url).origin,
  token: passwordResetToken.token,
});
```

**Why this matters**: This public route creates a valid password reset token and embeds it in a URL whose origin comes from the incoming request. If the app is reachable through a proxy or host configuration that forwards arbitrary `Host` / forwarded-host input, an attacker can request a password reset for a victim with an attacker-controlled host. The victim receives a legitimate DevStash reset email pointing at the attacker origin with the real reset token in the query string. If the victim opens it, the attacker can capture the token and use `/api/auth/reset-password` to take over the account.

No repo configuration or docs define a canonical public app URL or trusted host allowlist for these custom email routes. Next's local docs also describe route handlers as Web `Request` handlers and recommend reverse proxies for malformed requests/rate limiting when self-hosting; the application code should not rely on request origin for security-sensitive links.

**Fix**: Configure a canonical trusted application origin, for example `APP_URL=https://devstash.example.com`, validate it at startup, and use it for all verification and reset links. Do not use `new URL(request.url).origin` for token-bearing email links. Apply the same canonical-origin helper to `register` and `resend-verification` verification links.

### High

**Issue**: Credentials login has no server-side rate limiting
**File**: `src/auth.ts`
**Line(s)**: 38-70
**Severity**: High

**Evidence**:
```ts
async authorize(credentials) {
  const email =
    typeof credentials.email === "string"
      ? credentials.email.trim().toLowerCase()
      : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : "";

  if (!email || !password) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
```

**Why this matters**: `/api/auth/[...nextauth]` exports the Auth.js handlers, so this credentials `authorize` function is reachable through the public credentials callback. The code validates input and uses bcrypt, but there is no per-account, per-IP, or combined attempt throttle before repeated database lookups and bcrypt comparisons. A remote attacker can make unlimited password guesses against known emails. The searched repository and project docs do not contain an equivalent deployment assumption, rate-limit helper, proxy rule, CAPTCHA, lockout, or abuse-control layer. Auth.js's installed credentials provider docs explicitly call abuse detection/rate limiting an application responsibility for password-based auth.

**Fix**: Add a server-side rate limiter to credentials authorization before bcrypt comparison. Track attempts by normalized email plus request IP or another deployment-safe client key, return the same generic credentials failure message when limited, and reset/decay counters after successful login or a time window. If using an external store, make it shared across app instances.

### Medium

**Issue**: Forgot-password requests can send unlimited reset emails
**File**: `src/app/api/auth/forgot-password/route.ts`
**Line(s)**: 35-66
**Severity**: Medium

**Evidence**:
```ts
const user = await prisma.user.findUnique({
  where: { email },
  select: {
    email: true,
    name: true,
    passwordHash: true,
  },
});

if (!user?.email || !user.passwordHash) {
  return Response.json({ ok: true });
}

try {
  const passwordResetToken = await createPasswordResetToken(email);
  const resetUrl = createPasswordResetUrl({
    callbackUrl,
    email,
    origin: new URL(request.url).origin,
    token: passwordResetToken.token,
  });

  await sendPasswordResetEmail({
    email,
    name: user.name,
    resetUrl,
  });
} catch (error) {
  console.error("Unable to send password reset email.", error);
}
```

**Why this matters**: The endpoint correctly returns neutral success for absent users, but for existing email/password accounts every request creates a fresh reset token and attempts to send an email. Without throttling, an attacker can repeatedly send reset emails to a victim, invalidate previous reset links, and consume email provider quota. This is a reachable unauthenticated endpoint and no repository-level or documented deployment-level limiter was found.

**Fix**: Rate-limit reset requests by normalized email and request IP before creating a token or sending email. Consider a short resend cooldown per account and keep the neutral `{ ok: true }` response for all outcomes to avoid enumeration.

**Issue**: Verification resend can send unlimited verification emails
**File**: `src/app/api/auth/resend-verification/route.ts`
**Line(s)**: 40-76
**Severity**: Medium

**Evidence**:
```ts
const user = await prisma.user.findUnique({
  where: { email },
  select: {
    emailVerified: true,
    name: true,
    passwordHash: true,
  },
});

if (!user || user.emailVerified || !user.passwordHash) {
  return Response.json({ ok: true });
}

const verificationToken = await createEmailVerificationToken(email);
const verificationUrl = createEmailVerificationUrl({
  callbackUrl,
  email,
  origin: new URL(request.url).origin,
  token: verificationToken.token,
});

try {
  await sendVerificationEmail({
    email,
    name: user.name,
    verificationUrl,
  });
```

**Why this matters**: This public endpoint does not enumerate absent or already verified users, but it sends a new verification email for every request targeting an unverified email/password account. An attacker can repeatedly email-bomb a user and continuously invalidate earlier verification links. No equivalent rate limiter or deployment assumption was found in the repository.

**Fix**: Add server-side throttling by normalized email and request IP before creating the token. Enforce a resend cooldown and preserve the current neutral response for absent, already verified, and OAuth-only accounts.

### Low

No low severity issues found.

## Passed Checks

- Passwords are hashed with bcrypt before storage in registration, profile password changes, password resets, and seed data: `src/app/api/auth/register/route.ts:81`, `src/app/api/profile/password/route.ts:91`, `src/app/api/auth/reset-password/route.ts:71`, `prisma/seed.ts:423`.
- Credentials login compares submitted passwords with `bcrypt.compare` and returns a generic client-side message for invalid email/password: `src/auth.ts:62-70`, `src/components/auth/sign-in-form.tsx:36-38`.
- Credentials login enforces email verification when enabled and returns only `id`, `name`, `email`, and `image` from `authorize`: `src/auth.ts:72-81`.
- JWT/session callbacks add only `user.id`; password hashes, verification tokens, reset tokens, OAuth access tokens, and refresh tokens are not added to client-visible session data: `src/auth.ts:85-99`, `src/types/next-auth.d.ts:3-14`.
- Email verification and reset tokens use `randomBytes(32).toString("base64url")` and are stored as SHA-256 hashes, not plaintext tokens: `src/lib/auth/email-verification.ts:16-17`, `src/lib/auth/email-verification.ts:60-72`, `src/lib/auth/email-verification.ts:179-190`.
- Email verification tokens have a 24-hour TTL, expiration is enforced, the intended user is looked up by normalized email, and the token is deleted after successful verification: `src/lib/auth/email-verification.ts:5-7`, `src/lib/auth/email-verification.ts:101-174`.
- Password reset tokens have a 1-hour TTL, expiration is enforced, the reset path revalidates the token before mutation, the new password is hashed, and all outstanding reset tokens for that email are deleted after success: `src/lib/auth/email-verification.ts:177-195`, `src/lib/auth/email-verification.ts:217-346`, `src/app/api/auth/reset-password/route.ts:55-92`.
- Forgot-password responses are neutral for absent/non-password accounts: `src/app/api/auth/forgot-password/route.ts:44-66`.
- Verification resend responses are neutral for absent, already verified, and OAuth-only accounts: `src/app/api/auth/resend-verification/route.ts:49-76`.
- Token-bearing callback URLs are normalized to same-site paths and reject protocol-relative URLs: `src/lib/auth/email-verification.ts:38-53`, `src/app/(auth)/sign-in/page.tsx:20-35`, `src/app/(auth)/register/page.tsx:15-30`.
- Profile page access requires `auth()` and uses `session.user.id` for lookup: `src/app/profile/page.tsx:30-40`, `src/lib/db/profile.ts:3-76`.
- Profile password changes require a valid session, operate on `session.user.id`, require current password verification, reject OAuth-linked accounts for password changes, and update only `passwordHash`: `src/app/api/profile/password/route.ts:18-98`.
- Account deletion requires a valid session and deletes only the authenticated user's row by `session.user.id`: `src/app/api/profile/account/route.ts:4-15`.
- Profile responses do not return password hashes or OAuth tokens to the client; `getProfileOverview` selects `passwordHash` only to compute `canChangePassword` and omits it from the returned DTO: `src/lib/db/profile.ts:6-76`.
- NextAuth-managed CSRF and OAuth protections were not flagged: the project uses Auth.js handlers directly, and installed Auth.js code requires CSRF verification for credentials callbacks. No custom code was found disabling those protections.

## Notes

- Next.js local route-handler docs state that route handlers are not cached by default and non-GET methods are not cached, so the reviewed auth POST handlers are not silently static-cached by Next.js.
- Next.js local proxy docs state Proxy is useful for optimistic checks but is not a full session management or authorization solution. The profile API handlers correctly perform their own `auth()` checks instead of relying only on `src/proxy.ts`.
- Next.js local Server Actions docs warn that Server Functions are directly reachable by POST and must verify authorization internally. This audit found no auth-related Server Functions in the current custom auth flow; the auth mutations are route handlers and NextAuth handlers.
- Auth.js installed credentials provider docs identify abuse detection/rate limiting as part of the application responsibility for password-based authentication.
- Neon inspection was not needed; the code, Prisma schema, and local docs were sufficient for this focused audit.

## Summary

- Critical: 1
- High: 1
- Medium: 2
- Low: 0
- Top priority fixes: Replace request-derived email link origins with a configured canonical app origin; add server-side rate limiting to credentials login; add cooldown/rate limiting to forgot-password and verification resend endpoints.
