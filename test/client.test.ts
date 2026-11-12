import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TumblrClient } from '../src/client.ts';
import { TumblrApiError } from '../src/errors.ts';
import { fanOut, okValues } from '../src/fanout.ts';
import { oembed } from '../src/oembed.ts';

interface Call {
	url: string;
	init: RequestInit;
}

function mockFetch(handler: (call: Call) => Response | Promise<Response>) {
	const calls: Call[] = [];
	const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
		const call = { url, init: init ?? {} };
		calls.push(call);
		return handler(call);
	};
	return { calls, fetch: fetchImpl };
}

function jsonOk(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify({ meta: { status, msg: 'OK' }, response: payload }), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

test('apiKey auth appends api_key and preserves documented cursor params', async () => {
	const mock = mockFetch(() => jsonOk({ posts: [] }));
	const client = new TumblrClient({
		consumerKey: 'key123',
		userAgent: 'test/1.0',
		fetch: mock.fetch,
		retry: false
	});

	await client.userDashboard({ limit: 20, offset: 40, npf: true, reblog_info: true });
	const url = new URL(mock.calls[0]!.url);
	assert.equal(url.pathname, '/v2/user/dashboard');
	assert.equal(url.searchParams.get('api_key'), 'key123');
	assert.equal(url.searchParams.get('offset'), '40');
	assert.equal(url.searchParams.get('npf'), 'true');
	assert.equal(url.searchParams.get('before_id'), null);
});

test('oauth1 auth signs requests with an Authorization header', async () => {
	const mock = mockFetch(() => jsonOk({ user: { name: 'x' } }));
	const client = new TumblrClient({
		consumerKey: 'ck',
		consumerSecret: 'cs',
		token: 'tk',
		tokenSecret: 'ts',
		userAgent: 'test/1.0',
		fetch: mock.fetch,
		retry: false
	});

	await client.userInfo();
	const headers = new Headers(mock.calls[0]!.init.headers);
	assert.match(headers.get('authorization') ?? '', /^OAuth /);
	assert.equal(headers.get('user-agent'), 'test/1.0');
	assert.equal(new URL(mock.calls[0]!.url).searchParams.get('api_key'), null);
});

test('blog posts and notes use the current endpoints and params', async () => {
	const mock = mockFetch((call) =>
		call.url.includes('/notes')
			? jsonOk({ notes: [], total_notes: 0 })
			: jsonOk({ posts: [], total_posts: 0 })
	);
	const client = new TumblrClient({ consumerKey: 'key', fetch: mock.fetch, retry: false });

	await client.blogPosts('staff', { before: 1_700_000_000, npf: true });
	const postsUrl = new URL(mock.calls[0]!.url);
	assert.equal(postsUrl.pathname, '/v2/blog/staff/posts');
	assert.equal(postsUrl.searchParams.get('before'), '1700000000');
	assert.equal(postsUrl.searchParams.get('before_id'), null);

	await client.blogNotes('staff', { id: '123', before_timestamp: 1_600_000_000, mode: 'conversation' });
	const notesUrl = new URL(mock.calls[1]!.url);
	assert.equal(notesUrl.pathname, '/v2/blog/staff/notes');
	assert.equal(notesUrl.searchParams.get('id'), '123');
	assert.equal(notesUrl.searchParams.get('mode'), 'conversation');
});

test('bearer auth sets the Authorization header', async () => {
	const mock = mockFetch(() => jsonOk({ user: {} }));
	const client = new TumblrClient({
		auth: { type: 'bearer', accessToken: 'bearer-token' },
		fetch: mock.fetch,
		retry: false
	});
	await client.userInfo();
	assert.equal(new Headers(mock.calls[0]!.init.headers).get('authorization'), 'Bearer bearer-token');
});

test('429 responses are retried using Retry-After', async () => {
	let count = 0;
	const mock = mockFetch(() => {
		count++;
		if (count === 1) {
			return new Response(JSON.stringify({ meta: { status: 429, msg: 'Limit Exceeded' } }), {
				status: 429,
				headers: { 'retry-after': '0', 'content-type': 'application/json' }
			});
		}
		return jsonOk({ posts: [] });
	});
	const client = new TumblrClient({
		consumerKey: 'key',
		fetch: mock.fetch,
		retry: { attempts: 1, baseDelayMs: 1, maxDelayMs: 5 }
	});

	const result = await client.userDashboard({ limit: 20 });
	assert.equal(mock.calls.length, 2);
	assert.deepEqual(result.posts, []);
});

test('non-retryable errors surface as TumblrApiError with subcode', async () => {
	const mock = mockFetch(
		() =>
			new Response(
				JSON.stringify({
					meta: { status: 404, msg: 'Not Found' },
					response: { errors: [{ code: 'NOT_FOUND', title: 'Not Found' }] }
				}),
				{ status: 404, headers: { 'content-type': 'application/json' } }
			)
	);
	const client = new TumblrClient({ consumerKey: 'key', fetch: mock.fetch, retry: false });

	await assert.rejects(
		() => client.blogInfo('missing'),
		(error: unknown) => {
			assert.ok(error instanceof TumblrApiError);
			assert.equal(error.status, 404);
			assert.equal(error.subcode, 'NOT_FOUND');
			return true;
		}
	);
});

test('fanOut isolates account failures and keeps input order', async () => {
	const results = await fanOut(
		[{ blogName: 'a' }, { blogName: 'b' }, { blogName: 'c' }],
		async (account) => {
			if (account.blogName === 'b') throw new Error('expired token');
			return account.blogName.toUpperCase();
		},
		{ concurrency: 2 }
	);

	assert.deepEqual(
		results.map((result) => result.accountBlogName),
		['a', 'b', 'c']
	);
	assert.equal(results[1]!.ok, false);
	assert.equal(results[1]!.error, 'expired token');
	assert.deepEqual(okValues(results), ['A', 'C']);
});


test('likes endpoints use before/after timestamps, not offsets', async () => {
	const mock = mockFetch(() => jsonOk({ liked_posts: [], liked_count: 0 }));
	const client = new TumblrClient({ consumerKey: 'key', fetch: mock.fetch, retry: false });

	await client.userLikes({ limit: 20, before: 1_700_000_000, npf: true });
	await client.blogLikes('staff', { limit: 20, before: 1_600_000_000, npf: true });

	const userUrl = new URL(mock.calls[0]!.url);
	assert.equal(userUrl.pathname, '/v2/user/likes');
	assert.equal(userUrl.searchParams.get('before'), '1700000000');
	assert.equal(userUrl.searchParams.get('offset'), null);

	const blogUrl = new URL(mock.calls[1]!.url);
	assert.equal(blogUrl.pathname, '/v2/blog/staff/likes');
	assert.equal(blogUrl.searchParams.get('before'), '1600000000');
});

test('tagged search has no type parameter and supports filter', async () => {
	const mock = mockFetch(() => jsonOk([]));
	const client = new TumblrClient({ consumerKey: 'key', fetch: mock.fetch, retry: false });

	await client.tagged('#gif', { limit: 20, before: 1_700_000_000, npf: true });
	const url = new URL(mock.calls[0]!.url);
	assert.equal(url.pathname, '/v2/tagged');
	assert.equal(url.searchParams.get('tag'), '#gif');
	assert.equal(url.searchParams.get('before'), '1700000000');
	assert.equal(url.searchParams.get('type'), null);
	assert.equal(url.searchParams.get('npf'), 'true');
});

test('like/unlike and reblog use the documented form endpoints', async () => {
	const mock = mockFetch(() => jsonOk({}));
	const client = new TumblrClient({
		consumerKey: 'ck',
		consumerSecret: 'cs',
		token: 'tk',
		tokenSecret: 'ts',
		fetch: mock.fetch,
		retry: false
	});

	await client.like({ id: '123', reblog_key: 'rk' });
	await client.unlike({ id: '123', reblog_key: 'rk' });
	await client.reblog('staff', { id: '123', reblog_key: 'rk', comment: 'nice' });

	assert.equal(new URL(mock.calls[0]!.url).pathname, '/v2/user/like');
	assert.equal(String(mock.calls[0]!.init.body), 'id=123&reblog_key=rk');
	assert.equal(new URL(mock.calls[1]!.url).pathname, '/v2/user/unlike');
	assert.equal(new URL(mock.calls[2]!.url).pathname, '/v2/blog/staff/post/reblog');
	assert.match(String(mock.calls[2]!.init.body), /comment=nice/);
	assert.match(new Headers(mock.calls[2]!.init.headers).get('authorization') ?? '', /^OAuth /);
});

test('single post fetch and following use documented params', async () => {
	const mock = mockFetch(() => jsonOk({}));
	const client = new TumblrClient({ consumerKey: 'key', fetch: mock.fetch, retry: false });

	await client.post('staff', '987', { post_format: 'npf' });
	await client.userFollowing({ limit: 20, offset: 40 });
	await client.blogInfo('staff', { 'fields[blogs]': 'name,updated' });

	assert.equal(new URL(mock.calls[0]!.url).pathname, '/v2/blog/staff/posts/987');
	assert.equal(new URL(mock.calls[0]!.url).searchParams.get('post_format'), 'npf');
	assert.equal(new URL(mock.calls[1]!.url).searchParams.get('offset'), '40');
	assert.equal(
		new URL(mock.calls[2]!.url).searchParams.get('fields[blogs]'),
		'name,updated'
	);
});

test('OAuth token flow signs oauth_callback and oauth_verifier', async () => {
	const mock = mockFetch((call) =>
		call.url.includes('request_token')
			? new Response('oauth_token=temp&oauth_token_secret=secret&oauth_callback_confirmed=true', {
					status: 200,
					headers: { 'content-type': 'application/x-www-form-urlencoded' }
				})
			: new Response('oauth_token=access&oauth_token_secret=access-secret', {
					status: 200,
					headers: { 'content-type': 'application/x-www-form-urlencoded' }
				})
	);
	const client = new TumblrClient({
		consumerKey: 'ck',
		consumerSecret: 'cs',
		userAgent: 'test/1.0',
		fetch: mock.fetch
	});

	const temp = await client.requestToken('https://example.com/cb');
	assert.equal(temp.token, 'temp');
	const requestHeader = new Headers(mock.calls[0]!.init.headers).get('authorization') ?? '';
	assert.match(requestHeader, /oauth_callback="https%3A%2F%2Fexample.com%2Fcb"/);

	const access = await client.accessToken(temp.token, temp.tokenSecret, 'verifier');
	assert.equal(access.token, 'access');
	const accessHeader = new Headers(mock.calls[1]!.init.headers).get('authorization') ?? '';
	assert.match(accessHeader, /oauth_verifier="verifier"/);
	assert.match(accessHeader, /oauth_token="temp"/);
});


test('avatar URLs and queue/notifications params follow the docs', async () => {
	const mock = mockFetch((call) =>
		call.url.includes('/avatar/')
			? new Response(new Uint8Array([1, 2, 3]), {
					status: 200,
					headers: { 'content-type': 'image/png' }
				})
			: jsonOk({ notifications: [], posts: [] })
	);
	const client = new TumblrClient({ consumerKey: 'key', fetch: mock.fetch, retry: false, userAgent: 'test/1.0' });

	assert.equal(
		client.blogAvatarUrl('staff', 128),
		'https://api.tumblr.com/v2/blog/staff/avatar/128'
	);
	const avatar = await client.blogAvatar('staff', 128);
	assert.equal(avatar.headers.get('content-type'), 'image/png');

	await client.blogQueue('staff', { limit: 20, offset: 20, filter: 'text' });
	const queueUrl = new URL(mock.calls[1]!.url);
	assert.equal(queueUrl.pathname, '/v2/blog/staff/posts/queue');
	assert.equal(queueUrl.searchParams.get('filter'), 'text');

	await client.blogNotifications('staff', {
		before: 1_700_000_000,
		types: ['like', 'reblog_with_content'],
		rollups: false,
		omit_post_ids: ['123']
	});
	const notificationsUrl = new URL(mock.calls[2]!.url);
	assert.equal(notificationsUrl.pathname, '/v2/blog/staff/notifications');
	assert.equal(notificationsUrl.searchParams.get('types[0]'), 'like');
	assert.equal(notificationsUrl.searchParams.get('types[1]'), 'reblog_with_content');
	assert.equal(notificationsUrl.searchParams.get('omit_post_ids[0]'), '123');
	assert.equal(notificationsUrl.searchParams.get('rollups'), 'false');
});

test('NPF creation uses JSON and legacy deletion uses form data', async () => {
	const mock = mockFetch(() => jsonOk({}));
	const client = new TumblrClient({
		consumerKey: 'ck',
		consumerSecret: 'cs',
		token: 'tk',
		tokenSecret: 'ts',
		fetch: mock.fetch,
		retry: false
	});

	await client.createPost('staff', {
		content: [{ type: 'text', text: 'hello' }],
		tags: 'test'
	});
	assert.equal(new URL(mock.calls[0]!.url).pathname, '/v2/blog/staff/posts');
	assert.equal(new Headers(mock.calls[0]!.init.headers).get('content-type'), 'application/json');
	assert.deepEqual(JSON.parse(String(mock.calls[0]!.init.body)), {
		content: [{ type: 'text', text: 'hello' }],
		tags: 'test'
	});

	await client.deletePost('staff', '987');
	assert.equal(new URL(mock.calls[1]!.url).pathname, '/v2/blog/staff/post/delete');
	assert.equal(String(mock.calls[1]!.init.body), 'id=987');
});

test('filtered tags/content and community routes use documented paths', async () => {
	const mock = mockFetch(() => jsonOk({ filtered_tags: [], filtered_content: [] }));
	const client = new TumblrClient({
		consumerKey: 'ck',
		consumerSecret: 'cs',
		token: 'tk',
		tokenSecret: 'ts',
		fetch: mock.fetch,
		retry: false
	});

	await client.addFilteredTags(['tag one', 'tag two']);
	assert.equal(new URL(mock.calls[0]!.url).pathname, '/v2/user/filtered_tags');
	assert.equal(new Headers(mock.calls[0]!.init.headers).get('content-type'), 'application/json');

	await client.removeFilteredTag('tag one');
	assert.equal(new URL(mock.calls[1]!.url).pathname, '/v2/user/filtered_tags/tag%20one');

	await client.removeFilteredContent('bad words');
	const filteredUrl = new URL(mock.calls[2]!.url);
	assert.equal(filteredUrl.pathname, '/v2/user/filtered_content');
	assert.equal(filteredUrl.searchParams.get('filtered_content'), 'bad words');

	await client.communityTimeline('my-community', { limit: 20, before: 100 });
	assert.equal(new URL(mock.calls[3]!.url).pathname, '/v2/communities/my-community/timeline');

	await client.addCommunityReaction('my-community', '42', { slug: 'heart' });
	assert.equal(new URL(mock.calls[4]!.url).pathname, '/v2/communities/my-community/posts/42/reactions');
	assert.equal(String(mock.calls[4]!.init.body), JSON.stringify({ slug: 'heart' }));
});

test('OAuth 2.0 authorize and token endpoints follow the docs', async () => {
	const mock = mockFetch(() =>
		new Response(
			JSON.stringify({
				access_token: 'oauth2-token',
				expires_in: 2520,
				token_type: 'bearer',
				scope: 'basic write offline_access',
				refresh_token: 'refresh'
			}),
			{ status: 200, headers: { 'content-type': 'application/json' } }
		)
	);
	const client = new TumblrClient({
		consumerKey: 'ck',
		consumerSecret: 'cs',
		fetch: mock.fetch,
		userAgent: 'test/1.0'
	});

	const authorize = client.oauth2AuthorizeUrl({
		redirectUri: 'https://example.com/cb',
		state: 'state-1'
	});
	const authorizeUrl = new URL(authorize);
	assert.equal(authorizeUrl.hostname, 'www.tumblr.com');
	assert.equal(authorizeUrl.pathname, '/oauth2/authorize');
	assert.equal(authorizeUrl.searchParams.get('client_id'), 'ck');
	assert.equal(authorizeUrl.searchParams.get('response_type'), 'code');
	assert.equal(authorizeUrl.searchParams.get('state'), 'state-1');

	const token = await client.oauth2Token({ grantType: 'authorization_code', code: 'code-1' });
	assert.equal(token.access_token, 'oauth2-token');
	const tokenUrl = new URL(mock.calls[0]!.url);
	assert.equal(tokenUrl.pathname, '/v2/oauth2/token');
	const body = mock.calls[0]!.init.body as FormData;
	assert.equal(body.get('grant_type'), 'authorization_code');
	assert.equal(body.get('code'), 'code-1');
	assert.equal(body.get('client_id'), 'ck');
});


test('oEmbed uses the top-level endpoint and JSON response', async () => {
	const mock = mockFetch(() =>
		new Response(JSON.stringify({ type: 'rich', version: '1.0', title: 'A post' }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		})
	);
	const result = await oembed('https://staff.tumblr.com/post/1', {
		fetch: mock.fetch,
		userAgent: 'test/1.0'
	});
	assert.equal(result.title, 'A post');
	const url = new URL(mock.calls[0]!.url);
	assert.equal(url.origin + url.pathname, 'https://www.tumblr.com/oembed');
	assert.equal(url.searchParams.get('url'), 'https://staff.tumblr.com/post/1');
});

test('NPF multipart uploads send JSON plus media parts', async () => {
	const mock = mockFetch(() => jsonOk({}));
	const client = new TumblrClient({
		consumerKey: 'ck',
		consumerSecret: 'cs',
		token: 'tk',
		tokenSecret: 'ts',
		fetch: mock.fetch,
		retry: false
	});

	await client.createPostMultipart(
		'staff',
		{ content: [{ type: 'image', media: [] }] },
		{ '0': new Blob(['image-bytes'], { type: 'image/jpeg' }) }
	);
	const body = mock.calls[0]!.init.body;
	assert.ok(body instanceof FormData);
	const jsonPart = body.get('json');
	assert.ok(jsonPart instanceof Blob);
	assert.deepEqual(JSON.parse(await jsonPart.text()), {
		content: [{ type: 'image', media: [] }]
	});
	assert.ok(body.get('0') instanceof Blob);
	assert.equal(mock.calls[0]!.init.headers && new Headers(mock.calls[0]!.init.headers).get('content-type'), null);
});

test('removeBlock forwards anonymous_only', async () => {
	const mock = mockFetch(() => jsonOk({}));
	const client = new TumblrClient({
		consumerKey: 'ck',
		consumerSecret: 'cs',
		token: 'tk',
		tokenSecret: 'ts',
		fetch: mock.fetch,
		retry: false
	});
	await client.removeBlock('staff', { anonymous_only: true });
	const url = new URL(mock.calls[0]!.url);
	assert.equal(url.pathname, '/v2/blog/staff/blocks');
	assert.equal(url.searchParams.get('anonymous_only'), 'true');
});
