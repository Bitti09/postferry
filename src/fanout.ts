import { TumblrApiError } from './errors.ts';
import type { AccountResult } from './types.ts';

export interface FanOutOptions {
	/**
	 * Maximum number of accounts queried at once. Tumblr rate limits are
	 * per-consumer-key, so an unbounded fan-out across ten accounts can hit a
	 * limit in a single page load.
	 */
	concurrency?: number;
}

function statusOf(error: unknown): number | undefined {
	if (error instanceof TumblrApiError) return error.status;
	const status = (error as { statusCode?: number } | null)?.statusCode;
	return typeof status === 'number' ? status : undefined;
}

function messageOf(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

/**
 * Run a task for every account with per-account error isolation.
 *
 * A failed account becomes `{ ok: false, error, status }`; it never rejects
 * the whole batch. The result order matches the input order.
 */
export async function fanOut<T>(
	accounts: ReadonlyArray<{ blogName: string }>,
	run: (account: { blogName: string }, index: number) => Promise<T>,
	options: FanOutOptions = {}
): Promise<AccountResult<T>[]> {
	const concurrency = Math.max(1, Math.min(options.concurrency ?? 5, accounts.length || 1));
	const results: AccountResult<T>[] = new Array(accounts.length);
	let cursor = 0;

	async function worker(): Promise<void> {
		while (cursor < accounts.length) {
			const index = cursor++;
			const account = accounts[index]!;
			try {
				results[index] = { accountBlogName: account.blogName, ok: true, value: await run(account, index) };
			} catch (error) {
				results[index] = {
					accountBlogName: account.blogName,
					ok: false,
					error: messageOf(error),
					status: statusOf(error)
				};
			}
		}
	}

	await Promise.all(Array.from({ length: concurrency }, () => worker()));
	return results;
}

/** Collect the successful values from a fanOut result. */
export function okValues<T>(results: ReadonlyArray<AccountResult<T>>): T[] {
	return results.flatMap((result) => (result.ok && result.value !== undefined ? [result.value] : []));
}
