import { TumblrApiError } from "./errors.js";
import { oembed as fetchOembed } from "./oembed.js";
import { oauth1AuthorizationHeader, parseFormEncoded } from "./oauth1.js";
import { TumblrHttpClient } from "./request.js";
function buildMultipart(params, media) {
    const form = new FormData();
    form.append('json', new Blob([JSON.stringify(params)], { type: 'application/json' }));
    for (const [key, value] of Object.entries(media)) {
        const blob = value instanceof Blob ? value : new Blob([value]);
        form.append(key, blob);
    }
    return form;
}
const OAUTH_BASE = 'https://www.tumblr.com';
const DEFAULT_UA = 'postferry';
function normalizeAuth(options) {
    if (options.auth)
        return options.auth;
    if (options.consumerKey && options.token && options.tokenSecret) {
        return {
            type: 'oauth1',
            consumerKey: options.consumerKey,
            consumerSecret: options.consumerSecret ?? '',
            token: options.token,
            tokenSecret: options.tokenSecret
        };
    }
    if (options.consumerKey)
        return { type: 'apiKey', consumerKey: options.consumerKey };
    return { type: 'none' };
}
function segment(value) {
    return encodeURIComponent(value);
}
function tagQuery(tag) {
    return tag;
}
function requireConsumer(options) {
    if (!options.consumerKey || !options.consumerSecret) {
        throw new Error('consumerKey and consumerSecret are required for the OAuth 1.0a token flow');
    }
    return { consumerKey: options.consumerKey, consumerSecret: options.consumerSecret };
}
/**
 * Typed Tumblr API v2 client.
 *
 * Endpoint parameters follow the official documentation. In particular:
 *  - `/user/dashboard` paginates with `offset` and `since_id`; it has no
 *    `before_id` parameter.
 *  - `/blog/{blog}/posts` paginates with `before` (a Unix timestamp) or
 *    `offset`; it has no `before_id` parameter.
 *  - `/user/likes` and `/blog/{blog}/likes` paginate with `before`/`after`
 *    timestamps or `offset`.
 *  - Notes are paginated through `/blog/{blog}/notes` with
 *    `before_timestamp`, not through the posts endpoint.
 */
export class TumblrClient {
    http;
    baseUrl;
    options;
    auth;
    constructor(options = {}) {
        this.options = options;
        this.auth = normalizeAuth(options);
        this.baseUrl = options.baseUrl ?? 'https://api.tumblr.com';
        this.http = new TumblrHttpClient({
            auth: this.auth,
            baseUrl: this.baseUrl,
            userAgent: options.userAgent ?? DEFAULT_UA,
            fetch: options.fetch,
            retry: options.retry,
            timeoutMs: options.timeoutMs
        });
    }
    request(path, options = {}) {
        return this.http.request(path, options);
    }
    requestEnvelope(path, options = {}) {
        return this.http.requestEnvelope(path, options);
    }
    // ─── User ──────────────────────────────────────────────────────────────
    userInfo() {
        return this.request('/v2/user/info');
    }
    userLimits() {
        return this.request('/v2/user/limits');
    }
    userDashboard(params = {}) {
        return this.request('/v2/user/dashboard', { query: { ...params } });
    }
    userLikes(params = {}) {
        return this.request('/v2/user/likes', { query: { ...params } });
    }
    userFollowing(params = {}) {
        return this.request('/v2/user/following', { query: { ...params } });
    }
    // ─── Blog ──────────────────────────────────────────────────────────────
    blogInfo(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/info`, {
            query: { ...params }
        });
    }
    blogPosts(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts`, {
            query: { ...params, tag: tagQuery(params.tag) }
        });
    }
    blogLikes(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/likes`, {
            query: { ...params }
        });
    }
    blogNotes(blogIdentifier, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/notes`, {
            query: { ...params }
        });
    }
    /** Fetch a single post in NPF or legacy format. */
    post(blogIdentifier, postId, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/${segment(String(postId))}`, { query: { ...params } });
    }
    tagged(tag, params = {}) {
        return this.request('/v2/tagged', { query: { tag, ...params } });
    }
    // ─── Actions ───────────────────────────────────────────────────────────
    like(params) {
        return this.request('/v2/user/like', {
            method: 'POST',
            form: { id: params.id, reblog_key: params.reblog_key }
        });
    }
    unlike(params) {
        return this.request('/v2/user/unlike', {
            method: 'POST',
            form: { id: params.id, reblog_key: params.reblog_key }
        });
    }
    /** Legacy reblog endpoint (`/blog/{blog}/post/reblog`). */
    reblog(blogIdentifier, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/post/reblog`, {
            method: 'POST',
            form: {
                id: params.id,
                reblog_key: params.reblog_key,
                comment: params.comment,
                tags: params.tags
            },
            // Reblogs are not idempotent: only retry a rate-limited request.
            retry: { attempts: 1, baseDelayMs: 1_000, maxDelayMs: 8_000 }
        });
    }
    follow(params) {
        return this.request('/v2/user/follow', { method: 'POST', form: { url: params.url } });
    }
    unfollow(params) {
        return this.request('/v2/user/unfollow', { method: 'POST', form: { url: params.url } });
    }
    // ─── Blog avatar ──────────────────────────────────────────────────────
    /** Public avatar URL (no API call). */
    blogAvatarUrl(blogIdentifier, size = 64) {
        return `${this.baseUrl}/v2/blog/${segment(blogIdentifier)}/avatar/${size}`;
    }
    /** Fetch avatar bytes. The endpoint is public and returns an image. */
    async blogAvatar(blogIdentifier, size = 64) {
        const fetchImpl = this.options.fetch ?? globalThis.fetch.bind(globalThis);
        return fetchImpl(this.blogAvatarUrl(blogIdentifier, size), {
            headers: {
                'User-Agent': this.options.userAgent ?? DEFAULT_UA,
                Accept: 'image/*'
            }
        });
    }
    // ─── Blog blocks ──────────────────────────────────────────────────────
    blogBlocks(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/blocks`, { query: { ...params } });
    }
    blockBlog(blogIdentifier, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/blocks`, {
            method: 'POST',
            form: { blocked_tumblelog: params.blocked_tumblelog, post_id: params.post_id }
        });
    }
    blockBlogsBulk(blogIdentifier, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/blocks/bulk`, {
            method: 'POST',
            form: { blocked_tumblelogs: params.blocked_tumblelogs, force: params.force }
        });
    }
    removeBlock(blogIdentifier, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/blocks`, {
            method: 'DELETE',
            query: {
                blocked_tumblelog: params.blocked_tumblelog,
                post_id: params.post_id,
                anonymous_only: params.anonymous_only
            }
        });
    }
    // ─── Blog social graph ────────────────────────────────────────────────
    blogFollowing(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/following`, { query: { ...params } });
    }
    blogFollowers(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/followers`, { query: { ...params } });
    }
    blogFollowedBy(blogIdentifier, query) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/followed_by`, { query: { query } });
    }
    // ─── Queue, drafts, submissions, notifications ────────────────────────
    blogQueue(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/queue`, { query: { ...params } });
    }
    reorderQueue(blogIdentifier, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/queue/reorder`, {
            method: 'POST',
            form: { post_id: params.post_id, insert_after: params.insert_after ?? 0 }
        });
    }
    shuffleQueue(blogIdentifier) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/queue/shuffle`, { method: 'POST' });
    }
    blogDrafts(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/draft`, { query: { ...params } });
    }
    blogSubmissions(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/submission`, { query: { ...params } });
    }
    blogNotifications(blogIdentifier, params = {}) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/notifications`, {
            query: {
                before: params.before,
                types: params.types,
                rollups: params.rollups,
                omit_post_ids: params.omit_post_ids
            }
        });
    }
    // ─── Post creation / editing / deletion ───────────────────────────────
    createPost(blogIdentifier, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts`, {
            method: 'POST',
            json: params
        });
    }
    editPost(blogIdentifier, postId, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/${segment(String(postId))}`, {
            method: 'PUT',
            json: params
        });
    }
    createLegacyPost(blogIdentifier, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/post`, { method: 'POST', form: params });
    }
    editLegacyPost(blogIdentifier, params) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/post/edit`, { method: 'POST', form: params });
    }
    deletePost(blogIdentifier, postId) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/post/delete`, {
            method: 'POST',
            form: { id: postId }
        });
    }
    mutePost(blogIdentifier, postId) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/${segment(String(postId))}/mute`, {
            method: 'POST'
        });
    }
    unmutePost(blogIdentifier, postId) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/${segment(String(postId))}/mute`, {
            method: 'DELETE'
        });
    }
    // ─── User filters ─────────────────────────────────────────────────────
    filteredTags() {
        return this.request('/v2/user/filtered_tags');
    }
    addFilteredTags(tags) {
        return this.request('/v2/user/filtered_tags', { method: 'POST', json: { filtered_tags: tags } });
    }
    removeFilteredTag(tag) {
        return this.request(`/v2/user/filtered_tags/${segment(tag)}`, { method: 'DELETE' });
    }
    filteredContent() {
        return this.request('/v2/user/filtered_content');
    }
    addFilteredContent(strings) {
        return this.request('/v2/user/filtered_content', {
            method: 'POST',
            json: { filtered_content: strings }
        });
    }
    removeFilteredContent(value) {
        return this.request('/v2/user/filtered_content', {
            method: 'DELETE',
            query: { filtered_content: value }
        });
    }
    // ─── Communities (beta) ───────────────────────────────────────────────
    communities() {
        return this.request('/v2/communities');
    }
    community(handle) {
        return this.request(`/v2/communities/${segment(handle)}`);
    }
    editCommunity(handle, params) {
        return this.request(`/v2/communities/${segment(handle)}`, { method: 'PUT', json: params });
    }
    communityTimeline(handle, params = {}) {
        return this.request(`/v2/communities/${segment(handle)}/timeline`, { query: { ...params } });
    }
    communityMembers(handle, params = {}) {
        return this.request(`/v2/communities/${segment(handle)}/members`, { query: { ...params } });
    }
    joinCommunity(handle, params = {}) {
        return this.request(`/v2/communities/${segment(handle)}/members`, {
            method: 'PUT',
            json: params
        });
    }
    leaveCommunity(handle, blogIdentifier) {
        return this.request(`/v2/communities/${segment(handle)}/members/${segment(blogIdentifier)}`, {
            method: 'DELETE'
        });
    }
    setCommunityMemberRole(handle, blogIdentifier, params) {
        return this.request(`/v2/communities/${segment(handle)}/members/${segment(blogIdentifier)}`, {
            method: 'PUT',
            json: params
        });
    }
    inviteToCommunity(handle, params) {
        return this.request(`/v2/communities/${segment(handle)}/invitations`, {
            method: 'PUT',
            json: params
        });
    }
    communityInvitations(handle) {
        return this.request(`/v2/communities/${segment(handle)}/invitations`);
    }
    communityInvitation(handle, blogIdentifier) {
        return this.request(`/v2/communities/${segment(handle)}/invitations/${segment(blogIdentifier)}`);
    }
    cancelCommunityInvitation(handle, blogIdentifier) {
        return this.request(`/v2/communities/${segment(handle)}/invitations/${segment(blogIdentifier)}`, {
            method: 'DELETE'
        });
    }
    regenerateCommunityInviteHash(handle) {
        return this.request(`/v2/communities/${segment(handle)}/invite_hash`, { method: 'POST' });
    }
    addCommunityReaction(handle, postId, params) {
        return this.request(`/v2/communities/${segment(handle)}/posts/${segment(String(postId))}/reactions`, { method: 'PUT', json: params });
    }
    removeCommunityReaction(handle, postId, reactionId) {
        return this.request(`/v2/communities/${segment(handle)}/posts/${segment(String(postId))}/reactions/${segment(reactionId)}`, { method: 'DELETE' });
    }
    muteCommunity(handle) {
        return this.request(`/v2/communities/${segment(handle)}/mute`, { method: 'PUT' });
    }
    unmuteCommunity(handle) {
        return this.request(`/v2/communities/${segment(handle)}/mute`, { method: 'DELETE' });
    }
    // ─── OAuth 2.0 ────────────────────────────────────────────────────────
    oauth2AuthorizeUrl(params) {
        const oauth1 = this.auth.type === 'oauth1' ? this.auth : undefined;
        const clientId = params.clientId ?? this.options.consumerKey ?? oauth1?.consumerKey;
        if (!clientId)
            throw new Error('clientId (consumer key) is required for OAuth 2.0');
        const query = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            scope: params.scope ?? 'basic write offline_access',
            state: params.state
        });
        if (params.redirectUri)
            query.set('redirect_uri', params.redirectUri);
        return `https://www.tumblr.com/oauth2/authorize?${query.toString()}`;
    }
    async oauth2Token(params) {
        const oauth1 = this.auth.type === 'oauth1' ? this.auth : undefined;
        const clientId = params.clientId ?? this.options.consumerKey ?? oauth1?.consumerKey;
        const clientSecret = params.clientSecret ?? this.options.consumerSecret ?? oauth1?.consumerSecret;
        if (!clientId || !clientSecret) {
            throw new Error('clientId and clientSecret are required for OAuth 2.0');
        }
        // The docs use `curl -F`, i.e. multipart/form-data.
        const form = new FormData();
        form.set('grant_type', params.grantType);
        form.set('client_id', clientId);
        form.set('client_secret', clientSecret);
        if (params.code)
            form.set('code', params.code);
        if (params.refreshToken)
            form.set('refresh_token', params.refreshToken);
        if (params.redirectUri)
            form.set('redirect_uri', params.redirectUri);
        return this.tokenJson('/v2/oauth2/token', form);
    }
    async refreshOAuth2Token(params) {
        return this.oauth2Token({ grantType: 'refresh_token', ...params, refreshToken: params.refreshToken });
    }
    /** Exchange the current OAuth 1.0a credentials for OAuth 2.0 tokens. */
    async exchangeOAuth1ForOAuth2() {
        if (this.auth.type !== 'oauth1') {
            throw new Error('An OAuth 1.0a authenticated client is required for /v2/oauth2/exchange');
        }
        const url = `${this.baseUrl}/v2/oauth2/exchange`;
        const authorization = await oauth1AuthorizationHeader('POST', url, [], {
            consumerKey: this.auth.consumerKey,
            consumerSecret: this.auth.consumerSecret,
            token: this.auth.token,
            tokenSecret: this.auth.tokenSecret
        });
        const fetchImpl = this.options.fetch ?? globalThis.fetch.bind(globalThis);
        const response = await fetchImpl(url, {
            method: 'POST',
            headers: { Authorization: authorization, 'User-Agent': this.options.userAgent ?? DEFAULT_UA }
        });
        return this.parseTokenResponse(response);
    }
    async tokenJson(path, form) {
        const fetchImpl = this.options.fetch ?? globalThis.fetch.bind(globalThis);
        const response = await fetchImpl(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: {
                // Let fetch set the multipart boundary.
                'User-Agent': this.options.userAgent ?? DEFAULT_UA
            },
            body: form
        });
        return this.parseTokenResponse(response);
    }
    async parseTokenResponse(response) {
        const text = await response.text();
        let parsed;
        try {
            parsed = JSON.parse(text);
        }
        catch {
            parsed = undefined;
        }
        if (!response.ok) {
            throw new TumblrApiError(`OAuth 2.0 token request failed with HTTP ${response.status}`, {
                status: response.status,
                body: parsed ?? text
            });
        }
        return parsed;
    }
    // ─── oEmbed ────────────────────────────────────────────────────────────
    oembed(url) {
        return fetchOembed(url, {
            fetch: this.options.fetch,
            userAgent: this.options.userAgent
        });
    }
    // ─── NPF uploads ──────────────────────────────────────────────────────
    /**
     * Create a post with media uploads. The docs specify multipart/form-data
     * with the JSON body in the first part and media keyed by block identifier.
     */
    createPostMultipart(blogIdentifier, params, media) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts`, {
            method: 'POST',
            formData: buildMultipart(params, media)
        });
    }
    editPostMultipart(blogIdentifier, postId, params, media) {
        return this.request(`/v2/blog/${segment(blogIdentifier)}/posts/${segment(String(postId))}`, {
            method: 'PUT',
            formData: buildMultipart(params, media)
        });
    }
    // ─── OAuth 1.0a token flow ─────────────────────────────────────────────
    authorizeUrl(token) {
        return `${OAUTH_BASE}/oauth/authorize?oauth_token=${encodeURIComponent(token)}`;
    }
    async requestToken(callbackUrl) {
        const credentials = requireConsumer(this.options);
        const url = `${OAUTH_BASE}/oauth/request_token`;
        const header = await oauth1AuthorizationHeader('POST', url, [], credentials, {
            extraOAuthParams: { oauth_callback: callbackUrl }
        });
        const parsed = await this.formRequest(url, 'POST', header);
        if (!parsed.oauth_token || !parsed.oauth_token_secret) {
            throw new TumblrApiError('Tumblr did not return temporary OAuth credentials', {
                status: 502,
                body: parsed
            });
        }
        return {
            token: parsed.oauth_token,
            tokenSecret: parsed.oauth_token_secret,
            callbackConfirmed: parsed.oauth_callback_confirmed === 'true'
        };
    }
    async accessToken(token, tokenSecret, verifier) {
        const credentials = requireConsumer(this.options);
        const url = `${OAUTH_BASE}/oauth/access_token`;
        const header = await oauth1AuthorizationHeader('GET', url, [], { ...credentials, token, tokenSecret }, { extraOAuthParams: { oauth_verifier: verifier } });
        const parsed = await this.formRequest(url, 'GET', header);
        if (!parsed.oauth_token || !parsed.oauth_token_secret) {
            throw new TumblrApiError('Tumblr did not return access credentials', {
                status: 502,
                body: parsed
            });
        }
        return { token: parsed.oauth_token, tokenSecret: parsed.oauth_token_secret };
    }
    async formRequest(url, method, authorization) {
        const target = url;
        const response = await (this.options.fetch ?? globalThis.fetch.bind(globalThis))(target, {
            method,
            headers: {
                Authorization: authorization,
                'User-Agent': this.options.userAgent ?? DEFAULT_UA,
                ...(method === 'POST'
                    ? { 'Content-Type': 'application/x-www-form-urlencoded' }
                    : {})
            },
            body: method === 'POST' ? '' : undefined
        });
        const text = await response.text();
        if (!response.ok) {
            throw new TumblrApiError(`OAuth token request failed with HTTP ${response.status}`, {
                status: response.status,
                body: text
            });
        }
        return parseFormEncoded(text);
    }
}
/** Function form for callers that prefer not to use `new`. */
export function createTumblrClient(options = {}) {
    return new TumblrClient(options);
}
//# sourceMappingURL=client.js.map