import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combineFeedPosts, mergeFeedPost, mergeFeedPosts, postId } from '../src/merge.ts';
import type { TumblrPost } from '../src/types.ts';

function makePost(overrides: Partial<TumblrPost> & { id_string: string }): TumblrPost {
	const base = {
		id: Number(overrides.id_string),
		id_string: overrides.id_string,
		blog_name: 'source',
		timestamp: 1_700_000_000,
		summary: 'post',
		type: 'text',
		content: []
	} as TumblrPost;
	return { ...base, ...overrides };
}

test('postId prefers id_string over the lossy numeric id', () => {
	const post = { id: 123456789012345680, id_string: '123456789012345678' };
	assert.equal(postId(post), '123456789012345678');
});

test('same post from two accounts keeps per-account like state', () => {
	const a = makePost({ id_string: '1001', liked: true, liked_timestamp: 500, reblogged: true });
	const b = makePost({ id_string: '1001', liked: false, reblogged: false, summary: 'edited' });

	const merged = mergeFeedPosts([
		{ account: 'alpha', posts: [a] },
		{ account: 'beta', posts: [b] }
	]);

	assert.equal(merged.length, 1);
	const post = merged[0]!;
	assert.deepEqual(post.likedBy, { alpha: true, beta: false });
	assert.deepEqual(post.rebloggedBy, { alpha: true, beta: false });
	assert.equal(post.liked, true);
	assert.equal(post.reblogged, true);
	assert.equal(post.likedAt, 500);
	assert.equal(post.liked_timestamp, 500);
	assert.deepEqual(post.seenBy, ['alpha', 'beta']);
	assert.deepEqual(post.sources, ['alpha', 'beta']);
	assert.equal(post.summary, 'edited');
});

test('unlike on one account does not erase another account like', () => {
	const first = makePost({ id_string: '1002', liked: true, liked_timestamp: 900 });
	const second = makePost({ id_string: '1002', liked: false });

	let merged = mergeFeedPost(undefined, first, 'alpha', { liked: true, reblogged: false });
	merged = mergeFeedPost(merged, second, 'beta', { liked: false, reblogged: false });

	assert.equal(merged.likedBy!.alpha, true);
	assert.equal(merged.likedBy!.beta, false);
	assert.equal(merged.liked, true);
	assert.equal(merged.likedAt, 900);
});

test('likes sort by the most recent like across accounts', () => {
	const old = makePost({ id_string: '1', timestamp: 10, liked_timestamp: 100 });
	const fresh = makePost({ id_string: '2', timestamp: 5, liked_timestamp: 200 });
	const sorted = mergeFeedPosts(
		[
			{ account: 'a', posts: [old], liked: true },
			{ account: 'b', posts: [fresh], liked: true }
		],
		'liked'
	);
	assert.deepEqual(sorted.map((post) => post.id_string), ['2', '1']);
});

test('timestamp sort is descending', () => {
	const older = makePost({ id_string: '1', timestamp: 10 });
	const newer = makePost({ id_string: '2', timestamp: 20 });
	const sorted = mergeFeedPosts([{ account: 'a', posts: [older, newer] }]);
	assert.deepEqual(sorted.map((post) => post.id_string), ['2', '1']);
});


test('combineFeedPosts unions per-account state across pages', () => {
	const first = mergeFeedPost(undefined, makePost({ id_string: '77', liked_timestamp: 100 }), 'alpha', {
		liked: true,
		reblogged: false
	});
	const second = mergeFeedPost(undefined, makePost({ id_string: '77', liked_timestamp: 200 }), 'beta', {
		liked: true,
		reblogged: true
	});
	const combined = combineFeedPosts(first, second);
	assert.deepEqual(combined.likedBy, { alpha: true, beta: true });
	assert.deepEqual(combined.rebloggedBy, { alpha: false, beta: true });
	assert.equal(combined.liked, true);
	assert.equal(combined.reblogged, true);
	assert.equal(combined.likedAt, 200);
	assert.deepEqual(combined.seenBy, ['alpha', 'beta']);
});
