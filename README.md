# postferry

Unofficial, typed client for the Tumblr API v2 and Neue Post Format (NPF).

## ⚠️ Notice ⚠️

---

This library is **NOT** official, endorsed, sponsored by, or otherwise
associated with Tumblr in any way, shape, or form.

It was built using the API reference documents, and like any other project
built using the API (including those made using this library) should conform to
the [Tumblr Application Developer and API License
Agreement](https://www.tumblr.com/docs/api_agreement). Be sure you also follow
it.

`postferry` is dependency-free and runs on Node 18+, browsers, and edge
runtimes because request signing uses WebCrypto instead of Node's `crypto` or
`oauth` packages.

The endpoint behavior follows the publicly documented API:

- <https://www.tumblr.com/docs/en/api/v2>
- <https://www.tumblr.com/docs/npf>

## Install

```sh
npm install postferry
```

The package ships compiled ESM (`dist/index.js`) with TypeScript declarations.

See [`API-COVERAGE.md`](./API-COVERAGE.md) for the endpoint-by-endpoint map,
the NPF section map, and the deliberately missing client-side behaviours.

## Legal and responsible use

- You are responsible for complying with Tumblr's Terms of Service, API License
  Agreement, and Application Developer and API License Agreement. Nothing in
  this package grants permission to access Tumblr or to use its content.
- You must supply your own registered application credentials. This package
  ships with no API keys, tokens, or credentials.
- Treat OAuth tokens as secrets. Store them securely, do not log them, and do
  not embed them in client-side bundles or public repositories.
- Respect rate limits and `429` responses. The client retries with backoff and
  honours `Retry-After`, but that is not permission to exceed a limit.
- Do not use this package to scrape, bypass access controls, circumvent
  paywalls, or collect user data without a lawful basis.
- “Tumblr” and the Tumblr logo are trademarks of Tumblr, Inc. Do not use them
  to imply that this project is official or endorsed.
- The MIT license in `LICENSE` covers this package's source code only. It does
  not grant any rights to the Tumblr service, API, user content, or trademarks.

## Coverage

The client covers the documented v2 surface:

- **Blog**: info, avatar, blocks (list/block/bulk/remove), likes, following,
  followers, followed_by, posts, queue (+reorder/shuffle), drafts,
  submissions, notifications, notes, NPF and legacy create/edit (including
  multipart media uploads), delete, reblog, mute/unmute.
- **User**: info, limits, dashboard, likes, following, follow/unfollow,
  like/unlike, filtered tags and filtered content.
- **Tagged** search and **oEmbed**.
- **Communities** (beta): list/info/edit, timeline, members, roles,
  invitations, invite hash, reactions, mute.
- **OAuth**: OAuth 1.0a request/access tokens and the OAuth 2.0 authorize,
  token, refresh and OAuth1-to-OAuth2 exchange flows.
- `request()` / `requestEnvelope()` escape hatches for newly documented
  endpoints.

## Why this package exists

The upstream `tumblr.js` client only supports OAuth 1.0a, hard-codes a Node
`https` transport, and exposes untyped methods. This package adds:

- OAuth 1.0a, API-key and OAuth 2.0 bearer authentication.
- Typed request/response shapes, including NPF content and note modes.
- Correct pagination parameters per endpoint:
  - `/user/dashboard` uses `offset` and `since_id` (there is no `before_id`).
  - `/blog/{blog}/posts` uses `before` (Unix seconds) or `offset`.
  - `/user/likes` and `/blog/{blog}/likes` use `before`/`after` or `offset`.
  - Notes use `/blog/{blog}/notes` with `before_timestamp` and `mode`.
- Retries with jitter and `Retry-After` support for `429`/`5xx`.
- Per-account fan-out with error isolation and bounded concurrency.
- Multi-account feed merging that keeps `likedBy`/`rebloggedBy`/`sources`
  per account instead of letting the last response win.
- String-safe post IDs (`id_string`), because post IDs are 64-bit.
- Legacy-post detection: not every response is NPF, even with `npf=true`. Use
  `isNpfPost()`, `hasLegacyContent()` and `postFormat()`.

## How to use

```ts
import { TumblrClient, createTumblrClient } from 'postferry';

const client = createTumblrClient({
	consumerKey: process.env.TUMBLR_CONSUMER_KEY!,
	consumerSecret: process.env.TUMBLR_CONSUMER_SECRET!,
	token: account.token,
	tokenSecret: account.secret,
	userAgent: 'my-app/1.0'
});

const dashboard = await client.userDashboard({
	limit: 20,
	npf: true,
	reblog_info: true
});

// Older posts use offset; refreshes use since_id.
const older = await client.userDashboard({ limit: 20, offset: 20, npf: true });
const newer = await client.userDashboard({
	limit: 20,
	since_id: dashboard.posts[0]?.id_string,
	npf: true
});
```

Multi-account merge:

```ts
import { fanOut, mergeFeedPosts, postId } from 'postferry';

const results = await fanOut(accounts, (account) =>
	clients.get(account.blogName)!.userDashboard({ limit: 20, npf: true, reblog_info: true })
);

const posts = mergeFeedPosts(
	results.flatMap((result) =>
		result.ok && result.value
			? [{ account: result.accountBlogName, posts: result.value.posts }]
			: []
	)
);
```

OAuth 1.0a:

```ts
const requestToken = await client.requestToken(callbackUrl);
// redirect the user to client.authorizeUrl(requestToken.token)
const access = await client.accessToken(requestToken.token, requestToken.tokenSecret, verifier);
```

OAuth 2.0:

```ts
const authorizeUrl = client.oauth2AuthorizeUrl({
	redirectUri: callbackUrl,
	state: crypto.randomUUID()
});

const tokens = await client.oauth2Token({ grantType: 'authorization_code', code });
const bearer = createTumblrClient({
	auth: { type: 'bearer', accessToken: tokens.access_token },
	userAgent: 'my-app/1.0'
});
```

## Development

```sh
npm test        # node:test unit tests
npm run typecheck
npm run build   # emits dist/index.js and dist/index.d.ts
```

The test suite covers OAuth signing against the RFC 5849 vector, endpoint
parameters, JSON/legacy post bodies, avatars, communities routes, and OAuth
2.0 flows.
