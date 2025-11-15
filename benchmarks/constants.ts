export const Size = {
	SM: 32,
	MD: 64,
	LG: 128,
} as const;

export interface TaskOptions {
	beforeAll?: () => void;
	beforeEach?: () => void;
	afterAll?: () => void;
	afterEach?: () => void;
}
export type Task = [string, () => void, TaskOptions];
