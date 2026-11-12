# Changelog

## 0.1.0

Initial release.

- Typed client for the documented Tumblr API v2 surface.
- OAuth 1.0a, API-key, and OAuth 2.0 bearer authentication.
- OAuth 1.0a and OAuth 2.0 token flows, including refresh and OAuth1 exchange.
- Blog, user, tagged, notes, filtered-content, communities, and oEmbed endpoints.
- NPF multipart media uploads for create/edit.
- Retries with jitter and `Retry-After`.
- Bounded multi-account fan-out and feed merging with per-account state.
- NPF/legacy post detection and 64-bit-safe post IDs.
