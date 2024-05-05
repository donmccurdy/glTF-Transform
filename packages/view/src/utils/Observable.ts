import { Subscription } from '../constants.js';

export class Observable<Value> {
	public value: Value;
	private _subscriber: ((next: Value, prev: Value) => void) | null = null;

	constructor(value: Value) {
		this.value = value;
	}

	public subscribe(subscriber: (next: Value, prev: Value) => void): Subscription {
		if (this._subscriber) {
			throw new Error('Observable: Limit one subscriber per Observable.');
		}

		this._subscriber = subscriber;
		return () => (this._subscriber = null);
	}

	public next(value: Value) {
		const prevValue = this.value;
		this.value = value;
		if (this._subscriber) {
			this._subscriber(this.value, prevValue);
		}
	}

	public dispose() {
		this._subscriber = null;
	}
}
