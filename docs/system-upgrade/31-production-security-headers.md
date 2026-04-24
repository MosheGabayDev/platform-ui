# 31 — Production Security Headers

_Created: R022 (2026-04-24)_

## Status

Planning document. Headers are NOT yet enforced in production.
This is a pre-production blocker before public launch.

---

## Current State

No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, or
Referrer-Policy headers observed on either Nginx (EKS) or Flask (web-api).

---

## Recommended Header Set

### Nginx Ingress (`nginx.ingress.kubernetes.io/configuration-snippet`)

```nginx
add_header Content-Security-Policy
  "default-src 'self';
   script-src 'self' 'unsafe-inline' 'unsafe-eval';
   style-src 'self' 'unsafe-inline';
   img-src 'self' data: https:;
   connect-src 'self' https://ai-data-platform.com;
   frame-ancestors 'none';"
  always;

add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(self), geolocation=()" always;
```

### Next.js (`next.config.ts` `headers()`)

```typescript
{
  key: 'X-Frame-Options',
  value: 'DENY',
},
{
  key: 'X-Content-Type-Options',
  value: 'nosniff',
},
{
  key: 'Referrer-Policy',
  value: 'strict-origin-when-cross-origin',
},
```

### Flask (`apps/__init__.py` after_request hook)

```python
@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response
```

---

## Priority Order

| Header | Priority | Reason |
|--------|----------|--------|
| X-Frame-Options: DENY | HIGH | Prevent clickjacking; easy to add |
| X-Content-Type-Options: nosniff | HIGH | Prevent MIME sniffing; no side effects |
| Referrer-Policy | MEDIUM | Limits URL leakage in HTTP referer header |
| CSP | MEDIUM | Requires audit — `unsafe-inline` needed until nonces added |
| Permissions-Policy | LOW | Nice-to-have; restrict unused APIs |

---

## Blockers Before CSP Enforcement

1. Next.js currently requires `unsafe-inline` for styled-components / Tailwind style injection.
   Resolution: add nonce-based CSP or migrate to CSS modules.

2. Inline event handlers in legacy Jinja2 templates (Flask side) require `unsafe-inline`.
   Resolution: externalize scripts before enabling strict CSP.

---

## Implementation Steps (when ready)

1. Add `X-Frame-Options` and `X-Content-Type-Options` to Flask `after_request` — zero risk.
2. Add same headers to Next.js `next.config.ts` `headers()`.
3. Add to Nginx ingress annotation.
4. Audit CSP `script-src` violations using `Content-Security-Policy-Report-Only` for 2 weeks.
5. Switch to enforcing CSP after violations are resolved.
