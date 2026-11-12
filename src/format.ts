import type { TumblrPost } from './types.ts';

/**
 * A post is in NPF when it carries content blocks. The v2 API can still return
 * legacy posts (`body`, `photos`, `video_url`, `player`, `caption`) even when
 * `npf=true` was requested, because conversion is best-effort.
 */
export function isNpfPost(post: Pick<TumblrPost, 'content'> | null | undefined): boolean {
	return !!post && Array.isArray(post.content) && post.content.length > 0;
}

/** True when a post has any of the legacy display fields. */
export function hasLegacyContent(
	post: Pick<TumblrPost, 'body' | 'photos' | 'video_url' | 'player' | 'caption'> | null | undefined
): boolean {
	if (!post) return false;
	return !!(
		post.body ||
		(post.photos && post.photos.length > 0) ||
		post.video_url ||
		(post.player && post.player.length > 0) ||
		post.caption
	);
}

export type PostFormat = 'npf' | 'legacy' | 'empty';

export function postFormat(post: TumblrPost | null | undefined): PostFormat {
	if (isNpfPost(post)) return 'npf';
	if (hasLegacyContent(post)) return 'legacy';
	return 'empty';
}
