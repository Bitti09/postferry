/**
 * OAuth 1.0a signing for the Tumblr API.
 *
 * Implemented with WebCrypto (HMAC-SHA1), so the same code runs in Node 18+,
 * browsers and edge runtimes without a Node-only dependency.
 *
 * Reference: RFC 5849 §3.4 (signature base string, HMAC-SHA1).
 */
export interface OAuth1Credentials {
    consumerKey: string;
    consumerSecret: string;
    token?: string;
    tokenSecret?: string;
}
export interface OAuth1SignOptions {
    nonce?: string;
    timestamp?: number;
    /** Additional `oauth_*` parameters, e.g. oauth_callback or oauth_verifier. */
    extraOAuthParams?: Record<string, string>;
    /** Include oauth_version=1.0 (default true). */
    includeVersion?: boolean;
}
/** RFC 3986 percent-encoding (encodeURIComponent leaves !'()* unescaped). */
export declare function percentEncode(value: string): string;
/** Random hex nonce. Uses WebCrypto when available, Math.random otherwise. */
export declare function createNonce(byteLength?: number): string;
/**
 * Compute the OAuth 1.0a `oauth_signature` for a request.
 *
 * `params` must contain every query and form parameter that will be sent,
 * decoded into name/value pairs. The URL must not contain a query string.
 */
export declare function oauth1Signature(method: string, url: string, params: ReadonlyArray<readonly [string, string]>, credentials: OAuth1Credentials, options?: OAuth1SignOptions): Promise<string>;
/**
 * Build the `Authorization: OAuth ...` header value for a request.
 *
 * Parameter names/values are emitted in their encoded form as required by
 * RFC 5849 §3.5.1.
 */
export declare function oauth1AuthorizationHeader(method: string, url: string, params: ReadonlyArray<readonly [string, string]>, credentials: OAuth1Credentials, options?: OAuth1SignOptions): Promise<string>;
/** Parse an `application/x-www-form-urlencoded` token response. */
export declare function parseFormEncoded(body: string): Record<string, string>;
//# sourceMappingURL=oauth1.d.ts.map