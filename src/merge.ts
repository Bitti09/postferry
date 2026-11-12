import type { FeedPost, TumblrPost } from './types.ts';

/** Canonical post key. Never use the numeric `id` as a cache or Map key. */
export function postId(post: { id_string?: string; id: number | string }): string {
	return post.id_string || String(post.id);
}

export function isFeedPost(value: unknown): value is FeedPost {
	return !!value && typeof value === 'object' && 'id_string' in value;
}

function union(left: ReadonlyArray<string> | undefined, right: ReadonlyArray<string> | undefined): string[] {
	return [...new Set([...(left ?? []), ...(right ?? [])])].filter(Boolean);
}

function anyTrue(values: Record<string, boolean> | undefined): boolean {
	if (!values) return false;
	for (const value of Object.values(values)) if (value) return true;
	return false;
}

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
export function mergeFeedPost(
	into: FeedPost | undefined,
	post: TumblrPost,
	accountBlogName: string,
	flags: MergeFlags
): FeedPost {
	const likedBy: Record<string, boolean> = { ...(into?.likedBy ?? {}) };
	const rebloggedBy: Record<string, boolean> = { ...(into?.rebloggedBy ?? {}) };
	if (accountBlogName) {
		likedBy[accountBlogName] = flags.liked;
		rebloggedBy[accountBlogName] = flags.reblogged;
	}

	const seenBy = union(into?.seenBy, accountBlogName ? [accountBlogName] : []);
	const sources = union(into?.sources, accountBlogName ? [accountBlogName] : []);
	const candidate = flags.liked ? post.liked_timestamp ?? into?.likedAt : undefined;
	const likedAt =
		candidate === undefined
			? into?.likedAt
			: into?.likedAt === undefined
				? candidate
				: Math.max(into.likedAt, candidate);

	const merged: FeedPost = {
		...(into ?? {}),
		...post,
		likedBy,
		rebloggedBy,
		seenBy,
		sources,
		liked: anyTrue(likedBy),
		reblogged: anyTrue(rebloggedBy)
	};
	if (likedAt !== undefined) {
		merged.likedAt = likedAt;
		merged.liked_timestamp = likedAt;
	} else {
		merged.likedAt = undefined;
		merged.liked_timestamp = undefined;
	}
	return merged;
}

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
export function mergeFeedPosts(batches: ReadonlyArray<AccountPostBatch>, sort: FeedSort = 'timestamp'): FeedPost[] {
	const byId = new Map<string, FeedPost>();

	for (const batch of batches) {
		for (const post of batch.posts) {
			const id = postId(post);
			const existing = byId.get(id);
			const merged = mergeFeedPost(existing, post, batch.account, {
				liked: batch.liked ?? post.liked === true,
				reblogged: batch.reblogged ?? post.reblogged === true
			});
			byId.set(id, merged);
		}
	}

	const posts = [...byId.values()];
	if (sort === 'timestamp') {
		posts.sort((a, b) => b.timestamp - a.timestamp);
	} else if (sort === 'liked') {
		posts.sort((a, b) => (b.likedAt ?? b.liked_timestamp ?? 0) - (a.likedAt ?? a.liked_timestamp ?? 0));
	}
	return posts;
}

/**
 * Combine two already-merged copies of the same post (for example, a post
 * returned again by a top-up or a later page). Per-account maps are unioned so
 * a later response cannot erase state that only an earlier page carried.
 */
export function combineFeedPosts(into: FeedPost, post: FeedPost): FeedPost {
	const likedBy: Record<string, boolean> = { ...(into.likedBy ?? {}), ...(post.likedBy ?? {}) };
	const rebloggedBy: Record<string, boolean> = {
		...(into.rebloggedBy ?? {}),
		...(post.rebloggedBy ?? {})
	};
	const likedAtCandidates = [into.likedAt, post.likedAt, into.liked_timestamp, post.liked_timestamp].filter(
		(value): value is number => typeof value === 'number' && Number.isFinite(value)
	);
	const likedAt = likedAtCandidates.length > 0 ? Math.max(...likedAtCandidates) : undefined;
	return {
		...into,
		...post,
		likedBy,
		rebloggedBy,
		seenBy: union(into.seenBy, post.seenBy),
		sources: union(into.sources, post.sources),
		liked: anyTrue(likedBy),
		reblogged: anyTrue(rebloggedBy),
		...(likedAt !== undefined ? { likedAt, liked_timestamp: likedAt } : {})
	};
}

/** Union cached sources with the accounts that surfaced a post. */
export function mergeSources(...groups: ReadonlyArray<ReadonlyArray<string> | undefined>): string[] {
	return [...new Set(groups.flatMap((group) => group ?? []))].filter(Boolean);
}
