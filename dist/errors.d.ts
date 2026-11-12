import type { TumblrMeta } from './types.ts';
/**
 * Error raised for any non-2xx Tumblr API response.
 *
 * Tumblr wraps errors in `{ meta, response }`; `subcode` is the machine-readable
 * code found in `response.errors[0].code` when present (for example
 * `NOT_AUTHORIZED`), while `meta.msg` is the human-readable message.
 */
export declare class TumblrApiError extends Error {
    readonly status: number;
    readonly meta?: TumblrMeta;
    readonly subcode?: string;
    readonly body?: unknown;
    readonly retryAfterMs?: number;
    constructor(message: string, options: {
        status: number;
        meta?: TumblrMeta;
        subcode?: string;
        body?: unknown;
        retryAfterMs?: number;
    });
    get isRateLimited(): boolean;
    get isAuthError(): boolean;
    get isRetryable(): boolean;
}
export declare function isTumblrApiError(error: unknown): error is TumblrApiError;
//# sourceMappingURL=errors.d.ts.map