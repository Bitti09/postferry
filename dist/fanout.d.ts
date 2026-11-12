import type { AccountResult } from './types.ts';
export interface FanOutOptions {
    /**
     * Maximum number of accounts queried at once. Tumblr rate limits are
     * per-consumer-key, so an unbounded fan-out across ten accounts can hit a
     * limit in a single page load.
     */
    concurrency?: number;
}
/**
 * Run a task for every account with per-account error isolation.
 *
 * A failed account becomes `{ ok: false, error, status }`; it never rejects
 * the whole batch. The result order matches the input order.
 */
export declare function fanOut<T>(accounts: ReadonlyArray<{
    blogName: string;
}>, run: (account: {
    blogName: string;
}, index: number) => Promise<T>, options?: FanOutOptions): Promise<AccountResult<T>[]>;
/** Collect the successful values from a fanOut result. */
export declare function okValues<T>(results: ReadonlyArray<AccountResult<T>>): T[];
//# sourceMappingURL=fanout.d.ts.map