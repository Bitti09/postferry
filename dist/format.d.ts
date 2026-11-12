import type { TumblrPost } from './types.ts';
/**
 * A post is in NPF when it carries content blocks. The v2 API can still return
 * legacy posts (`body`, `photos`, `video_url`, `player`, `caption`) even when
 * `npf=true` was requested, because conversion is best-effort.
 */
export declare function isNpfPost(post: Pick<TumblrPost, 'content'> | null | undefined): boolean;
/** True when a post has any of the legacy display fields. */
export declare function hasLegacyContent(post: Pick<TumblrPost, 'body' | 'photos' | 'video_url' | 'player' | 'caption'> | null | undefined): boolean;
export type PostFormat = 'npf' | 'legacy' | 'empty';
export declare function postFormat(post: TumblrPost | null | undefined): PostFormat;
//# sourceMappingURL=format.d.ts.map