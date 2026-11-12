import type { TumblrMeta } from './types.ts';

/**
 * Error raised for any non-2xx Tumblr API response.
 *
 * Tumblr wraps errors in `{ meta, response }`; `subcode` is the machine-readable
 * code found in `response.errors[0].code` when present (for example
 * `NOT_AUTHORIZED`), while `meta.msg` is the human-readable message.
 */
export class TumblrApiError extends Error {
	readonly status: number;
	readonly meta?: TumblrMeta;
	readonly subcode?: string;
	readonly body?: unknown;
	readonly retryAfterMs?: number;

	constructor(
		message: string,
		options: {
			status: number;
			meta?: TumblrMeta;
			subcode?: string;
			body?: unknown;
			retryAfterMs?: number;
		}
	) {
		super(message);
		this.name = 'TumblrApiError';
		this.status = options.status;
		this.meta = options.meta;
		this.subcode = options.subcode;
		this.body = options.body;
		this.retryAfterMs = options.retryAfterMs;
	}

	get isRateLimited(): boolean {
		return this.status === 429;
	}

	get isAuthError(): boolean {
		return this.status === 401 || this.status === 403;
	}

	get isRetryable(): boolean {
		return this.status === 429 || (this.status >= 500 && this.status <= 504);
	}
}

export function isTumblrApiError(error: unknown): error is TumblrApiError {
	return error instanceof TumblrApiError;
}
