import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNpfPost, hasLegacyContent, postFormat } from '../src/format.ts';
import type { TumblrPost } from '../src/types.ts';

const base = {
	id: 1,
	id_string: '1',
	blog_name: 'x',
	timestamp: 1,
	summary: '',
	type: 'text'
} as TumblrPost;

test('detects NPF posts by content blocks', () => {
	assert.equal(isNpfPost({ ...base, content: [{ type: 'text', text: 'hi' }] }), true);
	assert.equal(isNpfPost({ ...base, content: [] }), false);
	assert.equal(isNpfPost(null), false);
});

test('detects legacy content when NPF content is absent', () => {
	assert.equal(hasLegacyContent({ ...base, body: '<p>hi</p>' }), true);
	assert.equal(hasLegacyContent({ ...base }), false);
});

test('postFormat prefers NPF and falls back to legacy', () => {
	assert.equal(postFormat({ ...base, content: [{ type: 'text', text: 'hi' }], body: '<p>legacy</p>' }), 'npf');
	assert.equal(postFormat({ ...base, body: '<p>legacy</p>', content: [] }), 'legacy');
	assert.equal(postFormat({ ...base, content: [] }), 'empty');
});
