type PLimitFn<T> = ((value: T, index: number) => Promise<void>) | ((value: T, index: number) => void);

/** Runs multiple async functions, with limited concurrency. */
export async function pLimit<T>(items: T[], limit: number, fn: PLimitFn<T>): Promise<void> {
	// Iterate values in order, 0–N.
	items = items.slice().reverse();

	let index = 0;

	// Spawn 'limit' concurrent functions.
	await Promise.all(
		[...Array(limit)].map(async () => {
			while (items.length > 0) {
				await fn(items.pop()!, index++);
			}
		}),
	);
}
