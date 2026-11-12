import { TumblrApiError } from './errors.ts';
import type { OEmbedResponse } from './types.ts';

export interface OEmbedOptions {
	/** Override the fetch implementation (tests, proxies, edge runtimes). */
	fetch?: (input: string, init?: RequestInit) => Promise<Response>;
	userAgent?: string;
}

const OEMBED_URL = 'https://www.tumblr.com/oembed';

/**
 * Tumblr's oEmbed endpoint. It is a top-level JSON response, not the usual
 * `{ meta, response }` envelope.
 */
export async function oembed(url: string, options: OEmbedOptions = {}): Promise<OEmbedResponse> {
	const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
	const target = `${OEMBED_URL}?${new URLSearchParams({ url }).toString()}`;
	const response = await fetchImpl(target, {
		headers: {
			Accept: 'application/json',
			'User-Agent': options.userAgent ?? 'postferry'
		}
	});
	const text = await response.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		parsed = undefined;
	}
	if (!response.ok) {
		throw new TumblrApiError(`oEmbed request failed with HTTP ${response.status}`, {
			status: response.status,
			body: parsed ?? text
		});
	}
	if (!parsed || typeof parsed !== 'object') {
		throw new TumblrApiError('oEmbed returned a non-JSON response', {
			status: response.status,
			body: text
		});
	}
	return parsed as OEmbedResponse;
}
