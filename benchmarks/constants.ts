export enum Size {
	SM = 32,
	MD = 64,
	LG = 128,
}

export interface TaskOptions {
	beforeAll?: () => void;
	beforeEach?: () => void;
	afterAll?: () => void;
	afterEach?: () => void;
}
export type Task = [string, () => void, TaskOptions];
