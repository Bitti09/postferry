/**
 * Error raised for any non-2xx Tumblr API response.
 *
 * Tumblr wraps errors in `{ meta, response }`; `subcode` is the machine-readable
 * code found in `response.errors[0].code` when present (for example
 * `NOT_AUTHORIZED`), while `meta.msg` is the human-readable message.
 */
export class TumblrApiError extends Error {
    status;
    meta;
    subcode;
    body;
    retryAfterMs;
    constructor(message, options) {
        super(message);
        this.name = 'TumblrApiError';
        this.status = options.status;
        this.meta = options.meta;
        this.subcode = options.subcode;
        this.body = options.body;
        this.retryAfterMs = options.retryAfterMs;
    }
    get isRateLimited() {
        return this.status === 429;
    }
    get isAuthError() {
        return this.status === 401 || this.status === 403;
    }
    get isRetryable() {
        return this.status === 429 || (this.status >= 500 && this.status <= 504);
    }
}
export function isTumblrApiError(error) {
    return error instanceof TumblrApiError;
}
//# sourceMappingURL=errors.js.map