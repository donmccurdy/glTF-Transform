import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';

export type EmptyParams = object | null | undefined;

export interface ValuePool<Value, Params extends EmptyParams = EmptyParams> {
	requestBase(base: Value): Value;
	releaseBase(base: Value): void;

	requestVariant(base: Value, params: Params): Value;
	releaseVariant(variant: Value): void;

	gc(): void;
	size(): number;
	dispose(): void;
}

/**
 * Pool of (optionally reusable) resources and resource variations.
 *
 * As Subjects publish many variations of the same values to Observers, it's important to
 * allocate those variations efficiently, reuse instances where possible, and clean up unused
 * instances. That bookkeeping is assigned to Pools (not a Reactive concept).
 *
 * @internal
 */
export class Pool<Value, Params extends EmptyParams = EmptyParams> implements ValuePool<Value, Params> {
	readonly name: string;
	readonly documentView: DocumentViewSubjectAPI;

	protected _users = new Map<Value, number>();

	constructor(name: string, documentView: DocumentViewSubjectAPI) {
		this.name = name;
		this.documentView = documentView;
	}

	protected _request(value: Value): Value {
		let users = this._users.get(value) || 0;
		this._users.set(value, ++users);
		return value;
	}

	protected _release(value: Value): Value {
		let users = this._users.get(value) || 0;
		this._users.set(value, --users);
		return value;
	}

	protected _disposeValue(value: Value): void {
		this._users.delete(value);
	}

	requestBase(base: Value): Value {
		return this._request(base);
	}

	releaseBase(base: Value): void {
		this._release(base);
	}

	requestVariant(base: Value, _params: EmptyParams) {
		return this._request(base);
	}

	releaseVariant(variant: Value): void {
		this._release(variant);
	}

	gc(): void {
		for (const [value, users] of this._users) {
			if (users <= 0) this._disposeValue(value);
		}
	}

	size(): number {
		return this._users.size;
	}

	dispose(): void {
		for (const [value] of this._users) {
			this._disposeValue(value);
		}
		this._users.clear();
	}
}
