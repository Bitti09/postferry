import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TumblrClient } from '../src/client.ts';
import { oembed } from '../src/oembed.ts';

// One entry per documented v2 endpoint group (see API-COVERAGE.md).
const REQUIRED_METHODS = [
	// Blog
	'blogInfo', 'blogAvatarUrl', 'blogAvatar', 'blogBlocks', 'blockBlog',
	'blockBlogsBulk', 'removeBlock', 'blogLikes', 'blogFollowing',
	'blogFollowers', 'blogFollowedBy', 'blogPosts', 'blogQueue', 'reorderQueue',
	'shuffleQueue', 'blogDrafts', 'blogSubmissions', 'blogNotifications',
	'blogNotes', 'createPost', 'createPostMultipart', 'editPost',
	'editPostMultipart', 'createLegacyPost', 'editLegacyPost', 'deletePost',
	'mutePost', 'unmutePost', 'post', 'reblog',
	// User
	'userInfo', 'userLimits', 'userDashboard', 'userLikes', 'userFollowing',
	'follow', 'unfollow', 'like', 'unlike', 'filteredTags', 'addFilteredTags',
	'removeFilteredTag', 'filteredContent', 'addFilteredContent',
	'removeFilteredContent',
	// Tagged / oEmbed
	'tagged', 'oembed',
	// Communities
	'communities', 'community', 'editCommunity', 'communityTimeline',
	'communityMembers', 'joinCommunity', 'leaveCommunity',
	'setCommunityMemberRole', 'inviteToCommunity', 'communityInvitations',
	'communityInvitation', 'cancelCommunityInvitation',
	'regenerateCommunityInviteHash', 'addCommunityReaction',
	'removeCommunityReaction', 'muteCommunity', 'unmuteCommunity',
	// OAuth
	'requestToken', 'accessToken', 'authorizeUrl', 'oauth2AuthorizeUrl',
	'oauth2Token', 'refreshOAuth2Token', 'exchangeOAuth1ForOAuth2',
	// Generic
	'request', 'requestEnvelope'
] as const;

test('every documented endpoint has a client method', () => {
	const client = new TumblrClient({ consumerKey: 'key', consumerSecret: 'secret' });
	for (const method of REQUIRED_METHODS) {
		assert.equal(typeof client[method], 'function', `missing client.${method}()`);
	}
});

test('oEmbed is exported as a standalone function', () => {
	assert.equal(typeof oembed, 'function');
});
