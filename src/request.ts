import { TumblrApiError } from './errors.ts';
import { oauth1AuthorizationHeader, percentEncode } from './oauth1.ts';
import type { TumblrApiResponse } from './types.ts';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type Auth =
	| { type: 'none' }
	| { type: 'apiKey'; consumerKey: string }
	| {
			type: 'oauth1';
			consumerKey: string;
			consumerSecret: string;
			token: string;
			tokenSecret: string;
	  }
	| { type: 'bearer'; accessToken: string };

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
	/** Called before every HTTP request (including retries) for quota/rate limiting. */
	beforeRequest?: () => void | Promise<void>;
}

const DEFAULT_BASE_URL = 'https://api.tumblr.com';
const DEFAULT_USER_AGENT = 'postferry';
const DEFAULT_RETRY: RetryOptions = { attempts: 2, baseDelayMs: 400, maxDelayMs: 8_000 };
const RETRYABLE_STATUS = new Set([429, 500, 501, 502, 503, 504]);

function isAbortError(error: unknown): boolean {
	return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason);
			return;
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason);
		};
		signal?.addEventListener('abort', onAbort, { once: true });
	});
}

function retryAfterMs(response: Response): number | undefined {
	const raw = response.headers.get('retry-after');
	if (!raw) return undefined;
	const seconds = Number(raw);
	if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
	const date = Date.parse(raw);
	if (Number.isFinite(date)) return Math.max(0, date - Date.now());
	return undefined;
}

function pickMessage(body: unknown, fallback: string): { message: string; subcode?: string } {
	if (body && typeof body === 'object') {
		const record = body as Record<string, unknown>;
		const meta = record.meta as { msg?: string } | undefined;
		const response = record.response as
			| { errors?: Array<{ code?: string; title?: string; detail?: string }> }
			| undefined;
		const first = response?.errors?.[0];
		const message = first?.detail || first?.title || meta?.msg || fallback;
		return { message, subcode: first?.code };
	}
	return { message: fallback };
}

/**
 * Low-level HTTP client: authentication, query/form encoding, timeouts,
 * error normalisation and retries with `Retry-After` support.
 */
export class TumblrHttpClient {
	readonly baseUrl: string;
	private readonly auth: Auth;
	private readonly userAgent: string;
	private readonly fetchImpl: FetchLike;
	private readonly retry: RetryOptions | false;
	private readonly timeoutMs: number;
	private readonly beforeRequest?: () => void | Promise<void>;

	constructor(options: HttpClientOptions = {}) {
		this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
		this.auth = options.auth ?? { type: 'none' };
		this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
		this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
		this.retry = options.retry === undefined ? DEFAULT_RETRY : options.retry;
		this.timeoutMs = options.timeoutMs ?? 30_000;
		this.beforeRequest = options.beforeRequest;
	}

	private buildPairs(values: Record<string, QueryValue> | undefined): Array<[string, string]> {
		if (!values) return [];
		const pairs: Array<[string, string]> = [];
		for (const [key, value] of Object.entries(values)) {
			if (value === undefined || value === null) continue;
			if (Array.isArray(value)) {
				value.forEach((item, index) => pairs.push([`${key}[${index}]`, String(item)]));
			} else {
				pairs.push([key, String(value)]);
			}
		}
		return pairs;
	}

	private urlWithQuery(path: string, query: Record<string, QueryValue> | undefined): string {
		const base = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
		const pairs = this.buildPairs(query);
		if (pairs.length === 0) return base;
		const search = pairs.map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`).join('&');
		return `${base}${base.includes('?') ? '&' : '?'}${search}`;
	}

	private async authHeaders(
		method: string,
		url: string,
		query: Array<[string, string]>,
		form: Array<[string, string]>
	): Promise<Record<string, string>> {
		const headers: Record<string, string> = {};
		switch (this.auth.type) {
			case 'none':
			case 'apiKey':
				// api_key is appended to the query string in requestEnvelope().
				break;
			case 'bearer':
				headers.Authorization = `Bearer ${this.auth.accessToken}`;
				break;
			case 'oauth1':
				headers.Authorization = await oauth1AuthorizationHeader(
					method,
					url.split('?')[0]!,
					[...query, ...form],
					{
						consumerKey: this.auth.consumerKey,
						consumerSecret: this.auth.consumerSecret,
						token: this.auth.token,
						tokenSecret: this.auth.tokenSecret
					}
				);
				break;
		}
		return headers;
	}

	/** Perform a request and return the full `{ meta, response }` envelope. */
	async requestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<TumblrApiResponse<T>> {
		const method = options.method ?? 'GET';
		const queryPairs = this.buildPairs(options.query);
		const formPairs = this.buildPairs(options.form);

		let url = this.urlWithQuery(path, options.query);
		if (this.auth.type === 'apiKey') {
			const separator = url.includes('?') ? '&' : '?';
			url += `${separator}api_key=${percentEncode(this.auth.consumerKey)}`;
		}

		const configuredRetry = options.retry === false ? false : (options.retry ?? this.retry);
		const retryOptions = configuredRetry === false ? false : { ...DEFAULT_RETRY, ...configuredRetry };
		const attempts = retryOptions ? Math.max(1, (retryOptions.attempts ?? 2) + 1) : 1;

		let lastError: unknown;
		for (let attempt = 0; attempt < attempts; attempt++) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), this.timeoutMs);
			const onAbort = () => controller.abort(options.signal?.reason);
			options.signal?.addEventListener('abort', onAbort, { once: true });

			try {
				await this.beforeRequest?.();
				const headers: Record<string, string> = {
					'User-Agent': this.userAgent,
					Accept: 'application/json',
					...options.headers,
					...(await this.authHeaders(method, url, queryPairs, formPairs))
				};

				let body: string | FormData | undefined;
				if (method !== 'GET' && options.formData) {
					body = options.formData;
				} else if (method !== 'GET' && options.json !== undefined) {
					body = JSON.stringify(options.json);
					headers['Content-Type'] = 'application/json';
				} else if (method !== 'GET' && formPairs.length > 0) {
					body = formPairs.map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`).join('&');
					headers['Content-Type'] = 'application/x-www-form-urlencoded';
				}

				const response = await this.fetchImpl(url, {
					method,
					headers,
					body,
					signal: controller.signal
				});

				const text = await response.text();
				let parsed: unknown = undefined;
				if (text) {
					try {
						parsed = JSON.parse(text);
					} catch {
						parsed = undefined;
					}
				}

				if (!response.ok) {
					const fallback = `Tumblr API request failed with HTTP ${response.status}`;
					const { message, subcode } = pickMessage(parsed, fallback);
					const meta = (parsed as { meta?: { status: number; msg: string } } | undefined)?.meta;
					const error = new TumblrApiError(message, {
						status: response.status,
						meta,
						subcode,
						body: parsed ?? text,
						retryAfterMs: retryAfterMs(response)
					});
					if (
						retryOptions &&
						attempt < attempts - 1 &&
						RETRYABLE_STATUS.has(response.status) &&
						(method === 'GET' || response.status === 429)
					) {
						const maxDelay = retryOptions.maxDelayMs ?? 8_000;
						const retryAfter = error.retryAfterMs;
						// A long Retry-After is a real quota wall, not something to
						// sleep through. Surface the 429 to the caller instead of
						// blocking a request (and a page spinner) for minutes.
						if (retryAfter !== undefined && retryAfter > maxDelay) {
							throw error;
						}
						lastError = error;
						const delay = Math.min(
							retryAfter ??
								Math.min((retryOptions.baseDelayMs ?? 400) * 2 ** attempt, maxDelay),
							maxDelay
						);
						await sleep(delay + Math.random() * 200, options.signal);
						continue;
					}
					throw error;
				}

				if (!parsed || typeof parsed !== 'object') {
					throw new TumblrApiError('Tumblr API returned a non-JSON response', {
						status: response.status,
						body: text
					});
				}

				const envelope = parsed as TumblrApiResponse<T>;
				if (!('response' in envelope)) {
					throw new TumblrApiError('Tumblr API response is missing the `response` field', {
						status: response.status,
						body: parsed
					});
				}
				return envelope;
			} catch (error) {
				if (isAbortError(error)) throw error;
				if (error instanceof TumblrApiError) throw error;
				lastError = error;
				if (retryOptions && attempt < attempts - 1 && method === 'GET') {
					const delay = Math.min(
						(retryOptions.baseDelayMs ?? 400) * 2 ** attempt,
						retryOptions.maxDelayMs ?? 8_000
					);
					await sleep(delay + Math.random() * 200, options.signal);
					continue;
				}
				throw error;
			} finally {
				clearTimeout(timeout);
				options.signal?.removeEventListener('abort', onAbort);
			}
		}

		throw lastError instanceof Error ? lastError : new Error(String(lastError));
	}

	/** Perform a request and return only the `response` payload. */
	async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
		const envelope = await this.requestEnvelope<T>(path, options);
		return envelope.response;
	}
}
