import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oauth1Signature, oauth1AuthorizationHeader } from '../src/oauth1.ts';

// RFC 5849 §1.2 worked example.
const credentials = {
	consumerKey: '9djdj82h48djs9d2',
	consumerSecret: 'j49sk3j29djd',
	token: 'kkk9d7dh3k39sjv7',
	tokenSecret: 'dh893hdasih9'
};

const params: Array<[string, string]> = [
	['b5', '=%3D'],
	['a3', 'a'],
	['c@', ''],
	['a2', 'r b'],
	['c2', ''],
	['a3', '2 q']
];

test('OAuth 1.0a signature matches the RFC 5849 example', async () => {
	const signature = await oauth1Signature('POST', 'http://example.com/request', params, credentials, {
		nonce: '7d8f3e4a',
		timestamp: 137131201,
		includeVersion: false
	});
	assert.equal(signature, 'r6/TJjbCOr97/+UU0NsvSne7s5g=');
});

test('OAuth 1.0a header includes protocol params and signature', async () => {
	const header = await oauth1AuthorizationHeader('GET', 'https://api.tumblr.com/v2/user/info', [], credentials, {
		nonce: 'abc',
		timestamp: 1_700_000_000
	});
	assert.match(header, /^OAuth /);
	assert.match(header, /oauth_consumer_key="9djdj82h48djs9d2"/);
	assert.match(header, /oauth_nonce="abc"/);
	assert.match(header, /oauth_signature="[^"]+"/);
	assert.match(header, /oauth_token="kkk9d7dh3k39sjv7"/);
});

test('extra OAuth params (oauth_callback) are signed and emitted', async () => {
	const header = await oauth1AuthorizationHeader(
		'POST',
		'https://www.tumblr.com/oauth/request_token',
		[],
		credentials,
		{ nonce: 'abc', timestamp: 1_700_000_000, extraOAuthParams: { oauth_callback: 'https://example.com/cb' } }
	);
	assert.match(header, /oauth_callback="https%3A%2F%2Fexample.com%2Fcb"/);
});
