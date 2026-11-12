import type { FeedPost, TumblrPost } from './types.ts';
/** Canonical post key. Never use the numeric `id` as a cache or Map key. */
export declare function postId(post: {
    id_string?: string;
    id: number | string;
}): string;
export declare function isFeedPost(value: unknown): value is FeedPost;
export interface MergeFlags {
    liked: boolean;
    reblogged: boolean;
}
/**
 * Merge one account's copy of a post into the accumulated feed post.
 *
 * The canonical body comes from the latest copy (the API may add fields as a
 * post is edited), while `likedBy`/`rebloggedBy` accumulate per account and
 * `liked`/`reblogged` are derived from the union. `liked_timestamp` becomes
 * the most recent like across accounts.
 */
export declare function mergeFeedPost(into: FeedPost | undefined, post: TumblrPost, accountBlogName: string, flags: MergeFlags): FeedPost;
export interface AccountPostBatch {
    account: string;
    posts: ReadonlyArray<TumblrPost>;
    /** Force the liked flag when the endpoint itself means "liked" (user likes). */
    liked?: boolean;
    /** Force the reblogged flag when known from another source. */
    reblogged?: boolean;
}
export type FeedSort = 'timestamp' | 'liked' | 'none';
/**
 * Merge the same post returned by any number of accounts into one list.
 * Ordering is descending by post timestamp, or by the most recent like when
 * `sort` is `'liked'` (the likes feeds).
 */
export declare function mergeFeedPosts(batches: ReadonlyArray<AccountPostBatch>, sort?: FeedSort): FeedPost[];
/**
 * Combine two already-merged copies of the same post (for example, a post
 * returned again by a top-up or a later page). Per-account maps are unioned so
 * a later response cannot erase state that only an earlier page carried.
 */
export declare function combineFeedPosts(into: FeedPost, post: FeedPost): FeedPost;
/** Union cached sources with the accounts that surfaced a post. */
export declare function mergeSources(...groups: ReadonlyArray<ReadonlyArray<string> | undefined>): string[];
//# sourceMappingURL=merge.d.ts.map