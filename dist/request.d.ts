import type { TumblrApiResponse } from './types.ts';
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type Auth = {
    type: 'none';
} | {
    type: 'apiKey';
    consumerKey: string;
} | {
    type: 'oauth1';
    consumerKey: string;
    consumerSecret: string;
    token: string;
    tokenSecret: string;
} | {
    type: 'bearer';
    accessToken: string;
};
export type QueryValue = string | number | boolean | undefined | null | ReadonlyArray<string | number>;
export interface RetryOptions {
    /** Additional attempts after the first one. Default 2 (three total). */
    attempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
}
export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    query?: Record<string, QueryValue>;
    /** Form parameters for POST/PUT/DELETE, encoded as x-www-form-urlencoded. */
    form?: Record<string, QueryValue>;
    /** JSON body. Mutually exclusive with `form`/`formData`. */
    json?: unknown;
    /** Multipart body. No Content-Type is set, so fetch adds the boundary. */
    formData?: FormData;
    signal?: AbortSignal;
    /** Override retry behaviour. */
    retry?: RetryOptions | false;
    headers?: Record<string, string>;
}
export interface HttpClientOptions {
    auth?: Auth;
    baseUrl?: string;
    /** Sent on every request; Tumblr requires a stable User-Agent. */
    userAgent?: string;
    fetch?: FetchLike;
    retry?: RetryOptions | false;
    timeoutMs?: number;
}
/**
 * Low-level HTTP client: authentication, query/form encoding, timeouts,
 * error normalisation and retries with `Retry-After` support.
 */
export declare class TumblrHttpClient {
    readonly baseUrl: string;
    private readonly auth;
    private readonly userAgent;
    private readonly fetchImpl;
    private readonly retry;
    private readonly timeoutMs;
    constructor(options?: HttpClientOptions);
    private buildPairs;
    private urlWithQuery;
    private authHeaders;
    /** Perform a request and return the full `{ meta, response }` envelope. */
    requestEnvelope<T>(path: string, options?: RequestOptions): Promise<TumblrApiResponse<T>>;
    /** Perform a request and return only the `response` payload. */
    request<T>(path: string, options?: RequestOptions): Promise<T>;
}
//# sourceMappingURL=request.d.ts.map