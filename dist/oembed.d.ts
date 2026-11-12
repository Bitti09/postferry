import type { OEmbedResponse } from './types.ts';
export interface OEmbedOptions {
    /** Override the fetch implementation (tests, proxies, edge runtimes). */
    fetch?: (input: string, init?: RequestInit) => Promise<Response>;
    userAgent?: string;
}
/**
 * Tumblr's oEmbed endpoint. It is a top-level JSON response, not the usual
 * `{ meta, response }` envelope.
 */
export declare function oembed(url: string, options?: OEmbedOptions): Promise<OEmbedResponse>;
//# sourceMappingURL=oembed.d.ts.map