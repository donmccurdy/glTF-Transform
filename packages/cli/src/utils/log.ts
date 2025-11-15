export let log: typeof console.log = console.log;

export function mockConsoleLog(_log: (...data: unknown[]) => void): void {
	log = _log;
}
