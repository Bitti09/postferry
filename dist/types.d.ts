export type PostType = 'text' | 'quote' | 'link' | 'answer' | 'video' | 'audio' | 'photo' | 'chat';
export type PostState = 'published' | 'queue' | 'draft' | 'private' | 'unapproved';
export type PostFormatFilter = 'text' | 'raw';
export type PostFilter = 'all' | PostType | 'image';
export interface MediaObject {
    url: string;
    type?: string;
    width?: number;
    height?: number;
    original_dimensions_missing?: boolean;
    has_original_dimensions?: boolean;
    cropped?: boolean;
    hd?: boolean;
    poster?: MediaObject | MediaObject[];
}
export type MediaItem = MediaObject;
export type TextBlockSubtype = 'heading1' | 'heading2' | 'quirky' | 'quote' | 'indented' | 'chat' | 'ordered-list-item' | 'unordered-list-item';
export interface TextBlock {
    type: 'text';
    text: string;
    subtype?: TextBlockSubtype;
    indent_level?: number;
    formatting?: FormatRange[];
}
export interface ImageBlock {
    type: 'image';
    /** Renditions of one image, widest first (NPF spec). */
    media: MediaObject[];
    caption?: string;
    alt_text?: string;
    attribution?: MediaAttribution;
    colors?: Record<string, string>;
    feedback_token?: string;
    /** Single-frame poster for GIFs (NPF spec). */
    poster?: MediaObject;
}
export interface VideoBlock {
    type: 'video';
    /** NPF specifies a single Media Object; arrays are tolerated on older payloads. */
    media?: MediaObject | MediaObject[];
    poster?: MediaObject | MediaObject[];
    thumbnail_url?: string;
    caption?: string;
    attribution?: MediaAttribution;
    url?: string;
    embed_html?: string;
    embed_iframe?: {
        url: string;
        width: number;
        height: number;
    };
    embed_url?: string;
    provider?: string;
    metadata?: unknown;
    filmstrip?: MediaObject | MediaObject[];
    can_autoplay_on_cellular?: boolean;
    /** Duration in milliseconds. */
    duration?: number;
}
export interface AudioBlock {
    type: 'audio';
    /** NPF specifies a single Media Object; arrays are tolerated on older payloads. */
    media?: MediaObject | MediaObject[];
    url?: string;
    title?: string;
    artist?: string;
    album?: string;
    poster?: MediaObject | MediaObject[];
    attribution?: MediaAttribution;
    embed_html?: string;
    embed_url?: string;
    provider?: string;
    metadata?: unknown;
}
export interface LinkBlock {
    type: 'link';
    url: string;
    title?: string;
    description?: string;
    author?: string;
    excerpt?: string;
    site_name?: string;
    display_url?: string;
    /** The spec's table says Media Object; the example shows an array. */
    poster?: MediaObject | MediaObject[];
}
export interface PaywallBlock {
    type: 'paywall';
    /** Present when consuming a paywalled post. */
    subtype?: 'cta' | 'divider' | 'disabled';
    url?: string;
    title?: string;
    text?: string;
    color?: string;
    is_visible?: boolean;
}
/** Forward compatibility: the NPF spec adds block types over time. */
export interface UnknownBlock {
    type: string;
    [key: string]: unknown;
}
export type NpfContentBlock = TextBlock | ImageBlock | VideoBlock | AudioBlock | LinkBlock | PaywallBlock | UnknownBlock;
export interface FormatRange {
    start: number;
    end: number;
    type: 'bold' | 'italic' | 'strikethrough' | 'small' | 'link' | 'mention' | 'color';
    url?: string;
    hex?: string;
    blog?: {
        name?: string;
        uuid?: string;
        url?: string;
    };
}
export interface AttributionBlog {
    name?: string;
    uuid?: string;
    url?: string;
    title?: string;
}
/** NPF spec: attribution types are link, blog, post and app. */
export interface LinkAttribution {
    type: 'link';
    url: string;
}
export interface BlogAttribution {
    type: 'blog';
    url?: string;
    blog: AttributionBlog;
}
export interface PostAttribution {
    type: 'post';
    url: string;
    post: {
        id: number | string;
    };
    blog: AttributionBlog;
}
export interface AppAttribution {
    type: 'app';
    url: string;
    app_name?: string;
    display_text?: string;
    logo?: MediaObject;
}
export type MediaAttribution = LinkAttribution | BlogAttribution | PostAttribution | AppAttribution;
export interface LayoutAsk {
    type: 'ask';
    blocks: number[];
    attribution?: BlogAttribution;
}
export interface LayoutRows {
    type: 'rows';
    display: Array<{
        blocks: number[];
        /** `weighted` is the default; `carousel` is a horizontally paging row. */
        mode?: {
            type: 'weighted' | 'carousel';
        };
    }>;
    truncate_after?: number;
}
/** Deprecated by the NPF spec in favour of rows.truncate_after, still returned. */
export interface LayoutCondensed {
    type: 'condensed';
    truncate_after?: number;
    blocks?: number[];
}
export type NpfLayoutBlock = LayoutAsk | LayoutRows | LayoutCondensed;
export type MediaBlock = NpfContentBlock;
export type PostLayout = NpfLayoutBlock;
export interface SubscriptionPlan {
    description?: string;
    currency_code?: string;
    monthly_price?: string;
    yearly_price?: string | null;
    member_perks?: string[];
    subscription_label?: string;
    checkout_labels?: {
        monthly?: string;
        yearly?: string;
        support?: string;
    };
    is_valid?: boolean;
}
export interface PostTrail {
    content?: NpfContentBlock[];
    layout?: NpfLayoutBlock[];
    broken_blog_name?: string;
    blog?: {
        name?: string;
        uuid?: string;
        url?: string;
        subscription_plan?: SubscriptionPlan;
    };
    post?: {
        id?: string;
        timestamp?: number;
        is_paywalled?: boolean;
        paywall_access?: 'member' | 'non-member' | 'creator' | 'disabled';
    };
    /** Present on paywalled trail items for non-members. */
    subscription_plan?: SubscriptionPlan;
}
export interface LegacyPhoto {
    original_size?: MediaObject;
    alt_sizes?: MediaObject[];
}
export interface TumblrPost {
    id: number;
    id_string: string;
    blog_name: string;
    blog?: {
        uuid?: string;
        name?: string;
        url?: string;
        title?: string;
        paywall_access?: 'member' | 'non-member' | 'creator' | 'disabled';
        is_paywalled?: boolean;
        subscription_plan?: SubscriptionPlan;
    };
    /** Present when a paywalled post has a non-member view. */
    paywall_reblog_view?: {
        content: NpfContentBlock[];
        layout?: NpfLayoutBlock[];
    };
    timestamp: number;
    date?: string;
    summary: string;
    body?: string;
    type: PostType;
    is_nsfw?: boolean;
    is_nsfw_content?: boolean;
    is_nsfw_blog?: boolean;
    is_advertisement?: boolean;
    is_pinned?: boolean;
    can_like?: boolean;
    can_reblog?: boolean;
    can_reply?: boolean;
    can_send_in_message?: boolean;
    followed?: boolean;
    liked?: boolean;
    liked_timestamp?: number;
    reblogged?: boolean;
    reblog_key?: string;
    reblogged_from_id?: string;
    reblogged_from_url?: string;
    reblogged_from_name?: string;
    reblogged_from_title?: string;
    reblogged_root_id?: string;
    reblogged_root_url?: string;
    reblogged_root_name?: string;
    reblogged_root_title?: string;
    state?: PostState;
    short_url?: string;
    post_url?: string;
    slug?: string;
    format?: 'html' | 'markdown' | 'raw';
    bookmarklet?: boolean;
    mobile?: boolean;
    parent_post_url?: string;
    genesis_post_id?: string;
    total_posts?: number;
    is_submission?: boolean;
    post_author?: string;
    anonymous_name?: string;
    anonymous_email?: string;
    note_count?: number;
    like_count?: number;
    reblog_count?: number;
    reply_count?: number;
    source_url?: string;
    source_title?: string;
    tags?: string[];
    /** True when the post is stored in NPF; `content` is then authoritative. */
    is_blocks_post_format?: boolean;
    content: NpfContentBlock[];
    layout?: NpfLayoutBlock[];
    trail?: PostTrail[];
    photos?: LegacyPhoto[];
    video_url?: string;
    thumbnail_url?: string;
    player?: Array<{
        embed_code?: string;
        width?: number;
        height?: number;
    }>;
    caption?: string;
    notes?: TumblrNote[];
}
export interface NoteBase {
    type: 'like' | 'reblog' | 'reply' | 'posted';
    timestamp: number;
    blog_name: string;
    blog_uuid: string;
    blog_url: string;
    followed: boolean;
    avatar_shape: string;
}
export type TumblrNote = (NoteBase & {
    type: 'like';
}) | (NoteBase & {
    type: 'reblog';
    post_id: string;
    reblog_parent_blog_name?: string;
    added_text?: string;
    tags?: string[];
}) | (NoteBase & {
    type: 'reply';
    reply_text: string;
}) | (NoteBase & {
    type: 'posted';
});
export type NotesMode = 'all' | 'likes' | 'conversation' | 'rollup' | 'reblogs_with_tags';
export interface TumblrBlog {
    name: string;
    url: string;
    title: string;
    description: string;
    uuid?: string;
    updated?: number;
    posts?: number;
    ask?: boolean;
    ask_anon?: boolean;
    ask_page_title?: string;
    followed?: boolean;
    can_send_fan_mail?: boolean;
    can_subscribe?: boolean;
    is_nsfw?: boolean;
    share_likes?: boolean;
    share_following?: boolean;
    type?: string;
    primary?: boolean;
    likes?: number;
    avatar?: MediaObject[];
    followers?: number;
    tweet?: string;
    is_blocked_from_primary?: boolean;
    theme?: Record<string, unknown>;
}
export interface TumblrUser {
    name: string;
    likes: number;
    following: number;
    default_post_format: string;
    blogs: TumblrBlog[];
    email?: string;
}
export interface TumblrMeta {
    status: number;
    msg: string;
}
export interface TumblrLink {
    type?: 'navigation' | 'action';
    method?: string;
    href: string;
    query_params?: Record<string, string | number>;
}
export interface TumblrApiResponse<T> {
    meta: TumblrMeta;
    response: T;
    _links?: Record<string, TumblrLink>;
}
export interface UserInfoResponse {
    user: TumblrUser;
}
export interface DashboardResponse {
    posts: TumblrPost[];
    _links?: Record<string, TumblrLink>;
}
export interface BlogInfoResponse {
    blog: TumblrBlog;
}
export interface BlogPostsResponse {
    blog?: TumblrBlog;
    posts: TumblrPost[];
    total_posts?: number;
    _links?: Record<string, TumblrLink>;
}
export interface BlogLikesResponse {
    liked_posts: TumblrPost[];
    liked_count: number;
    _links?: Record<string, TumblrLink>;
}
export interface UserLikesResponse {
    liked_posts: TumblrPost[];
    liked_count: number;
    _links?: Record<string, TumblrLink>;
}
export interface UserFollowingResponse {
    blogs: TumblrBlog[];
    total_blogs: number;
    _links?: Record<string, TumblrLink>;
}
export interface NotesResponse {
    notes: TumblrNote[];
    rollup_notes?: TumblrNote[];
    total_notes: number;
    total_likes?: number;
    total_reblogs?: number;
    _links?: Record<string, TumblrLink>;
}
export interface PostDetailResponse {
    object_type: 'post';
    type: string;
    id: string;
    id_string?: string;
    blog_name?: string;
    blog?: TumblrBlog;
    tumblelog_uuid?: string;
    parent_post_id?: string;
    parent_tumblelog_uuid?: string;
    reblog_key?: string;
    trail?: PostTrail[];
    content?: NpfContentBlock[];
    layout?: NpfLayoutBlock[];
    notes?: TumblrNote[];
    queued_state?: string;
    scheduled_publish_time?: number;
    publish_on?: string;
    interactability_reblog?: 'everyone' | 'noone';
    [key: string]: unknown;
}
export interface DashboardParams {
    limit?: number;
    offset?: number;
    type?: PostType;
    since_id?: string | number;
    reblog_info?: boolean;
    notes_info?: boolean;
    npf?: boolean;
}
export interface LikesParams {
    limit?: number;
    offset?: number;
    before?: number;
    after?: number;
    /** Global NPF parameter: any endpoint returning posts accepts npf=true. */
    npf?: boolean;
}
export interface FollowingParams {
    limit?: number;
    offset?: number;
}
export interface BlogInfoParams {
    'fields[blogs]'?: string;
}
export interface BlogPostsParams {
    type?: PostType;
    id?: string | number;
    tag?: string | string[];
    limit?: number;
    offset?: number;
    reblog_info?: boolean;
    notes_info?: boolean;
    filter?: PostFormatFilter;
    before?: number;
    after?: number;
    sort?: 'desc' | 'asc';
    npf?: boolean;
}
export interface BlogNotesParams {
    id: string | number;
    before_timestamp?: number;
    mode?: NotesMode;
}
export interface TaggedParams {
    before?: number;
    limit?: number;
    filter?: PostFormatFilter;
    npf?: boolean;
}
export interface LikeParams {
    id: string | number;
    reblog_key: string;
}
export interface ReblogParams {
    id: string | number;
    reblog_key: string;
    comment?: string;
    tags?: string;
}
export interface FollowParams {
    url: string;
}
/**
 * Per-account state attached to a post that was returned by more than one
 * account. `likedBy` and `rebloggedBy` are authoritative; `liked` and
 * `reblogged` on the post are derived from them by `mergeFeedPost`.
 */
export interface FeedMeta {
    likedBy: Record<string, boolean>;
    rebloggedBy: Record<string, boolean>;
    /** Accounts whose API response contained this post. */
    seenBy: string[];
    /** Accounts/blogs this post was cached from. */
    sources: string[];
    /** Most recent `liked_timestamp` across accounts that liked it. */
    likedAt?: number;
}
export type FeedPost = TumblrPost & Partial<FeedMeta>;
export interface AccountResult<T> {
    accountBlogName: string;
    ok: boolean;
    /** Defined only when ok. */
    value?: T;
    /** Defined only when !ok. */
    error?: string;
    status?: number;
}
export interface BlogBlocksParams {
    offset?: number;
    limit?: number;
}
export interface BlockBlogParams {
    /** Blog identifier to block. Required unless post_id is supplied. */
    blocked_tumblelog?: string;
    /** Anonymous ask/submission post id to block. */
    post_id?: string | number;
    /** Remove all anonymous IP blocks (DELETE only, without blocked_tumblelog). */
    anonymous_only?: boolean;
}
export interface BlockBlogsBulkParams {
    /** Comma-separated blog identifiers. */
    blocked_tumblelogs: string;
    force?: boolean;
}
export interface BlogFollowingParams {
    limit?: number;
    offset?: number;
}
export interface BlogFollowersParams {
    limit?: number;
    offset?: number;
}
export interface BlogFollowedByParams {
    query: string;
}
export interface QueueParams {
    offset?: number;
    limit?: number;
    filter?: PostFormatFilter;
}
export interface QueueReorderParams {
    post_id: string | number;
    insert_after?: string | number;
}
export interface DraftsParams {
    before_id?: string | number;
    filter?: PostFormatFilter;
}
export interface SubmissionsParams {
    offset?: number;
    filter?: PostFormatFilter;
}
export type NotificationType = 'like' | 'reply' | 'follow' | 'mention_in_reply' | 'mention_in_post' | 'reblog_naked' | 'reblog_with_content' | 'ask' | 'answered_ask' | 'new_group_blog_member' | 'post_attribution' | 'post_flagged' | 'post_appeal_accepted' | 'post_appeal_rejected' | 'what_you_missed' | 'conversational_note';
export interface NotificationsParams {
    before?: number;
    types?: NotificationType[];
    rollups?: boolean;
    omit_post_ids?: Array<string | number>;
}
export interface FilteredTagsResponse {
    filtered_tags: string[];
}
export interface FilteredContentResponse {
    filtered_content: string[];
}
/** Legacy post creation/editing body. The spec documents many type-specific fields. */
export type LegacyPostParams = Record<string, string | number | boolean | ReadonlyArray<string | number> | undefined>;
/** NPF content input for create/edit/reblog. */
export interface NpfPostParams {
    content: NpfContentBlock[];
    layout?: NpfLayoutBlock[];
    state?: PostState;
    publish_on?: string;
    date?: string;
    /** Comma-separated tags. */
    tags?: string;
    source_url?: string;
    send_to_twitter?: boolean;
    is_private?: boolean;
    slug?: string;
    interactability_reblog?: 'everyone' | 'noone';
}
export interface NpfReblogParams extends NpfPostParams {
    parent_tumblelog_uuid: string;
    parent_post_id: string | number;
    reblog_key: string;
    hide_trail?: boolean;
    exclude_trail_items?: number[];
}
export interface OAuth2TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    refresh_token?: string;
    id_token?: string | false;
}
export interface Community {
    [key: string]: unknown;
}
export interface CommunityTimelineParams {
    limit?: number;
    before?: number;
}
export interface CommunityMembersParams {
    limit?: number;
    offset?: number;
}
export interface CommunityMemberRoleParams {
    role: string;
}
export interface CommunityInviteParams {
    /** Blog to invite, as any blog identifier. */
    recipient_blog: string;
    message?: string;
}
export interface CommunityJoinParams {
    invite_hash?: string;
}
export interface CommunityReactionParams {
    /** Reaction slug, e.g. `thumbs_up`. Takes precedence over grapheme. */
    slug?: string;
    /** Unicode emoji to use as the reaction. */
    grapheme?: string;
}
export interface OEmbedResponse {
    type: string;
    version: string;
    provider_name?: string;
    provider_url?: string;
    title?: string;
    author_name?: string;
    author_url?: string;
    html?: string;
    width?: number;
    height?: number;
    thumbnail_url?: string;
    thumbnail_width?: number;
    thumbnail_height?: number;
    cache_age?: number;
    [key: string]: unknown;
}
//# sourceMappingURL=types.d.ts.map