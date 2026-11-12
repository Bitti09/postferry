import { TumblrHttpClient, type Auth, type FetchLike, type RequestOptions, type RetryOptions } from './request.ts';
import type { BlogBlocksParams, BlogFollowersParams, BlogFollowingParams, BlogInfoParams, BlogInfoResponse, BlockBlogParams, BlockBlogsBulkParams, Community, CommunityInviteParams, CommunityJoinParams, CommunityMemberRoleParams, CommunityMembersParams, CommunityReactionParams, CommunityTimelineParams, DraftsParams, FilteredContentResponse, FilteredTagsResponse, LegacyPostParams, NotificationsParams, NpfPostParams, NpfReblogParams, OAuth2TokenResponse, OEmbedResponse, QueueParams, QueueReorderParams, SubmissionsParams, BlogLikesResponse, BlogNotesParams, BlogPostsParams, BlogPostsResponse, DashboardParams, DashboardResponse, FollowParams, FollowingParams, LikesParams, LikeParams, NotesResponse, PostDetailResponse, ReblogParams, TaggedParams, TumblrPost, TumblrApiResponse, UserFollowingResponse, UserInfoResponse, UserLikesResponse } from './types.ts';
export interface TumblrClientOptions {
    auth?: Auth;
    /** Shorthand credentials, mirroring the official tumblr.js constructor. */
    consumerKey?: string;
    consumerSecret?: string;
    token?: string;
    tokenSecret?: string;
    baseUrl?: string;
    userAgent?: string;
    fetch?: FetchLike;
    retry?: RetryOptions | false;
    timeoutMs?: number;
}
export interface OAuthToken {
    token: string;
    tokenSecret: string;
}
export interface OAuthRequestToken extends OAuthToken {
    callbackConfirmed: boolean;
}
/** A file accepted in an NPF multipart upload. */
export type MediaUpload = Blob | Uint8Array | ArrayBuffer | string;
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
export declare class TumblrClient {
    readonly http: TumblrHttpClient;
    readonly baseUrl: string;
    private readonly options;
    private readonly auth;
    constructor(options?: TumblrClientOptions);
    request<T>(path: string, options?: RequestOptions): Promise<T>;
    requestEnvelope<T>(path: string, options?: RequestOptions): Promise<TumblrApiResponse<T>>;
    userInfo(): Promise<UserInfoResponse>;
    userLimits(): Promise<Record<string, unknown>>;
    userDashboard(params?: DashboardParams): Promise<DashboardResponse>;
    userLikes(params?: LikesParams): Promise<UserLikesResponse>;
    userFollowing(params?: FollowingParams): Promise<UserFollowingResponse>;
    blogInfo(blogIdentifier: string, params?: BlogInfoParams): Promise<BlogInfoResponse>;
    blogPosts(blogIdentifier: string, params?: BlogPostsParams): Promise<BlogPostsResponse>;
    blogLikes(blogIdentifier: string, params?: LikesParams): Promise<BlogLikesResponse>;
    blogNotes(blogIdentifier: string, params: BlogNotesParams): Promise<NotesResponse>;
    /** Fetch a single post in NPF or legacy format. */
    post(blogIdentifier: string, postId: string | number, params?: {
        post_format?: 'npf' | 'legacy';
    }): Promise<PostDetailResponse>;
    tagged(tag: string, params?: TaggedParams): Promise<TumblrPost[]>;
    like(params: LikeParams): Promise<unknown>;
    unlike(params: LikeParams): Promise<unknown>;
    /** Legacy reblog endpoint (`/blog/{blog}/post/reblog`). */
    reblog(blogIdentifier: string, params: ReblogParams): Promise<unknown>;
    follow(params: FollowParams): Promise<unknown>;
    unfollow(params: FollowParams): Promise<unknown>;
    /** Public avatar URL (no API call). */
    blogAvatarUrl(blogIdentifier: string, size?: number): string;
    /** Fetch avatar bytes. The endpoint is public and returns an image. */
    blogAvatar(blogIdentifier: string, size?: number): Promise<Response>;
    blogBlocks(blogIdentifier: string, params?: BlogBlocksParams): Promise<{
        blocked_tumblelogs: unknown[];
        _links?: unknown;
    }>;
    blockBlog(blogIdentifier: string, params: BlockBlogParams): Promise<unknown>;
    blockBlogsBulk(blogIdentifier: string, params: BlockBlogsBulkParams): Promise<unknown>;
    removeBlock(blogIdentifier: string, params: BlockBlogParams): Promise<unknown>;
    blogFollowing(blogIdentifier: string, params?: BlogFollowingParams): Promise<{
        blogs: unknown[];
        total_blogs: number;
    }>;
    blogFollowers(blogIdentifier: string, params?: BlogFollowersParams): Promise<{
        users: unknown[];
        total_users: number;
    }>;
    blogFollowedBy(blogIdentifier: string, query: string): Promise<{
        followed_by: boolean;
    }>;
    blogQueue(blogIdentifier: string, params?: QueueParams): Promise<BlogPostsResponse>;
    reorderQueue(blogIdentifier: string, params: QueueReorderParams): Promise<unknown>;
    shuffleQueue(blogIdentifier: string): Promise<unknown>;
    blogDrafts(blogIdentifier: string, params?: DraftsParams): Promise<BlogPostsResponse>;
    blogSubmissions(blogIdentifier: string, params?: SubmissionsParams): Promise<BlogPostsResponse>;
    blogNotifications(blogIdentifier: string, params?: NotificationsParams): Promise<{
        notifications: unknown[];
        _links?: unknown;
    }>;
    createPost(blogIdentifier: string, params: NpfPostParams | NpfReblogParams): Promise<unknown>;
    editPost(blogIdentifier: string, postId: string | number, params: NpfPostParams): Promise<unknown>;
    createLegacyPost(blogIdentifier: string, params: LegacyPostParams): Promise<unknown>;
    editLegacyPost(blogIdentifier: string, params: LegacyPostParams): Promise<unknown>;
    deletePost(blogIdentifier: string, postId: string | number): Promise<unknown>;
    mutePost(blogIdentifier: string, postId: string | number): Promise<unknown>;
    unmutePost(blogIdentifier: string, postId: string | number): Promise<unknown>;
    filteredTags(): Promise<FilteredTagsResponse>;
    addFilteredTags(tags: string[]): Promise<unknown>;
    removeFilteredTag(tag: string): Promise<unknown>;
    filteredContent(): Promise<FilteredContentResponse>;
    addFilteredContent(strings: string[]): Promise<unknown>;
    removeFilteredContent(value: string): Promise<unknown>;
    communities(): Promise<Community[]>;
    community(handle: string): Promise<Community>;
    editCommunity(handle: string, params: Record<string, unknown>): Promise<Community>;
    communityTimeline(handle: string, params?: CommunityTimelineParams): Promise<{
        posts: unknown[];
    }>;
    communityMembers(handle: string, params?: CommunityMembersParams): Promise<{
        members: unknown[];
    }>;
    joinCommunity(handle: string, params?: CommunityJoinParams): Promise<unknown>;
    leaveCommunity(handle: string, blogIdentifier: string): Promise<unknown>;
    setCommunityMemberRole(handle: string, blogIdentifier: string, params: CommunityMemberRoleParams): Promise<unknown>;
    inviteToCommunity(handle: string, params: CommunityInviteParams): Promise<unknown>;
    communityInvitations(handle: string): Promise<{
        invitations: unknown[];
    }>;
    communityInvitation(handle: string, blogIdentifier: string): Promise<unknown>;
    cancelCommunityInvitation(handle: string, blogIdentifier: string): Promise<unknown>;
    regenerateCommunityInviteHash(handle: string): Promise<{
        invite_hash: string;
    }>;
    addCommunityReaction(handle: string, postId: string | number, params: CommunityReactionParams): Promise<unknown>;
    removeCommunityReaction(handle: string, postId: string | number, reactionId: string): Promise<unknown>;
    muteCommunity(handle: string): Promise<unknown>;
    unmuteCommunity(handle: string): Promise<unknown>;
    oauth2AuthorizeUrl(params: {
        clientId?: string;
        redirectUri?: string;
        scope?: string;
        state: string;
    }): string;
    oauth2Token(params: {
        grantType: 'authorization_code' | 'refresh_token';
        code?: string;
        refreshToken?: string;
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
    }): Promise<OAuth2TokenResponse>;
    refreshOAuth2Token(params: {
        refreshToken: string;
        clientId?: string;
        clientSecret?: string;
    }): Promise<OAuth2TokenResponse>;
    /** Exchange the current OAuth 1.0a credentials for OAuth 2.0 tokens. */
    exchangeOAuth1ForOAuth2(): Promise<OAuth2TokenResponse>;
    private tokenJson;
    private parseTokenResponse;
    oembed(url: string): Promise<OEmbedResponse>;
    /**
     * Create a post with media uploads. The docs specify multipart/form-data
     * with the JSON body in the first part and media keyed by block identifier.
     */
    createPostMultipart(blogIdentifier: string, params: NpfPostParams | NpfReblogParams, media: Record<string, MediaUpload>): Promise<unknown>;
    editPostMultipart(blogIdentifier: string, postId: string | number, params: NpfPostParams, media: Record<string, MediaUpload>): Promise<unknown>;
    authorizeUrl(token: string): string;
    requestToken(callbackUrl: string): Promise<OAuthRequestToken>;
    accessToken(token: string, tokenSecret: string, verifier: string): Promise<OAuthToken>;
    private formRequest;
}
/** Function form for callers that prefer not to use `new`. */
export declare function createTumblrClient(options?: TumblrClientOptions): TumblrClient;
//# sourceMappingURL=client.d.ts.map