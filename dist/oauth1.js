/**
 * OAuth 1.0a signing for the Tumblr API.
 *
 * Implemented with WebCrypto (HMAC-SHA1), so the same code runs in Node 18+,
 * browsers and edge runtimes without a Node-only dependency.
 *
 * Reference: RFC 5849 §3.4 (signature base string, HMAC-SHA1).
 */
var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
const encoder = new TextEncoder();
/** RFC 3986 percent-encoding (encodeURIComponent leaves !'()* unescaped). */
export function percentEncode(value) {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
function encodePair(pair) {
    return `${percentEncode(pair[0])}=${percentEncode(pair[1])}`;
}
function sortedPairs(pairs) {
    return [...pairs]
        .sort((a, b) => {
        const left = percentEncode(a[0]);
        const right = percentEncode(b[0]);
        if (left !== right)
            return left < right ? -1 : 1;
        const leftValue = percentEncode(a[1]);
        const rightValue = percentEncode(b[1]);
        return leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
    })
        .map(encodePair)
        .join('&');
}
function base64(bytes) {
    const view = new Uint8Array(bytes);
    let binary = '';
    for (let i = 0; i < view.length; i++)
        binary += String.fromCharCode(view[i]);
    return btoa(binary);
}
async function getSubtle() {
    if (globalThis.crypto?.subtle)
        return globalThis.crypto.subtle;
    // Node 18 exposes WebCrypto on node:crypto before it became a global.
    try {
        // Keep the specifier dynamic so browser bundlers do not try to resolve a
        // Node built-in into the client graph.
        const specifier = ['node', 'crypto'].join(':');
        const nodeCrypto = (await import(__rewriteRelativeImportExtension(/* @vite-ignore */ specifier)));
        if (nodeCrypto.webcrypto?.subtle)
            return nodeCrypto.webcrypto.subtle;
    }
    catch {
        // Not Node, or node:crypto is unavailable in this runtime.
    }
    throw new Error('WebCrypto SubtleCrypto is unavailable; cannot sign OAuth 1.0a requests');
}
async function hmacSha1(key, payload) {
    const subtle = await getSubtle();
    const imported = await subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const signature = await subtle.sign('HMAC', imported, encoder.encode(payload));
    return base64(signature);
}
/** Random hex nonce. Uses WebCrypto when available, Math.random otherwise. */
export function createNonce(byteLength = 16) {
    const crypto = globalThis.crypto;
    if (crypto?.getRandomValues) {
        const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
        return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let out = '';
    for (let i = 0; i < byteLength * 2; i++)
        out += Math.floor(Math.random() * 16).toString(16);
    return out;
}
/**
 * Compute the OAuth 1.0a `oauth_signature` for a request.
 *
 * `params` must contain every query and form parameter that will be sent,
 * decoded into name/value pairs. The URL must not contain a query string.
 */
export async function oauth1Signature(method, url, params, credentials, options = {}) {
    const oauthParams = [
        ['oauth_consumer_key', credentials.consumerKey],
        ['oauth_nonce', options.nonce ?? createNonce()],
        ['oauth_signature_method', 'HMAC-SHA1'],
        ['oauth_timestamp', String(options.timestamp ?? Math.floor(Date.now() / 1000))]
    ];
    if (options.includeVersion !== false)
        oauthParams.push(['oauth_version', '1.0']);
    if (credentials.token)
        oauthParams.push(['oauth_token', credentials.token]);
    for (const [key, value] of Object.entries(options.extraOAuthParams ?? {})) {
        oauthParams.push([key, value]);
    }
    const all = [...params, ...oauthParams];
    const baseUrl = url.split('?')[0].split('#')[0];
    const baseString = [
        method.toUpperCase(),
        percentEncode(baseUrl),
        percentEncode(sortedPairs(all))
    ].join('&');
    const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.tokenSecret ?? '')}`;
    return hmacSha1(signingKey, baseString);
}
/**
 * Build the `Authorization: OAuth ...` header value for a request.
 *
 * Parameter names/values are emitted in their encoded form as required by
 * RFC 5849 §3.5.1.
 */
export async function oauth1AuthorizationHeader(method, url, params, credentials, options = {}) {
    const nonce = options.nonce ?? createNonce();
    const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
    const oauthParams = [
        ['oauth_consumer_key', credentials.consumerKey],
        ['oauth_nonce', nonce],
        ['oauth_signature_method', 'HMAC-SHA1'],
        ['oauth_timestamp', String(timestamp)]
    ];
    if (options.includeVersion !== false)
        oauthParams.push(['oauth_version', '1.0']);
    if (credentials.token)
        oauthParams.push(['oauth_token', credentials.token]);
    for (const [key, value] of Object.entries(options.extraOAuthParams ?? {})) {
        oauthParams.push([key, value]);
    }
    const signature = await oauth1Signature(method, url, params, credentials, {
        nonce,
        timestamp,
        extraOAuthParams: options.extraOAuthParams,
        includeVersion: options.includeVersion
    });
    const headerParams = [...oauthParams, ['oauth_signature', signature]];
    return `OAuth ${headerParams
        .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
        .join(', ')}`;
}
/** Parse an `application/x-www-form-urlencoded` token response. */
export function parseFormEncoded(body) {
    const result = {};
    for (const [key, value] of new URLSearchParams(body))
        result[key] = value;
    return result;
}
//# sourceMappingURL=oauth1.js.map