import type { Property as PropertyDef } from '@gltf-transform/core';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import type { Subject } from '../subjects/index.js';
import type { Subscription } from '../constants.js';
import { Observable } from '../utils/index.js';
import { EmptyParams } from '../pools/index.js';
import { RefObserver } from './RefObserver.js';

/** @internal */
export class RefListObserver<
	Def extends PropertyDef,
	Value,
	Params extends EmptyParams = EmptyParams,
> extends Observable<Value[]> {
	readonly name: string;

	protected readonly _documentView: DocumentViewSubjectAPI;

	private readonly _observers: RefObserver<Def, Value>[] = [];
	private readonly _subscriptions: Subscription[] = [];

	constructor(name: string, documentView: DocumentViewSubjectAPI) {
		super([]);
		this.name = name;
		this._documentView = documentView;
	}

	update(defs: Def[]) {
		const added = new Set<Subject<Def, Value>>();
		const removed = new Set<number>();

		let needsUpdate = false;

		// TODO(perf): Is this an many next()s as it looks like? Maybe
		// only when an early index is removed from a longer list?
		for (let i = 0; i < defs.length || i < this._observers.length; i++) {
			const def = defs[i];
			const observer = this._observers[i];

			if (!def) {
				removed.add(i);
				needsUpdate = true;
			} else if (!observer) {
				added.add(this._documentView.bind(def) as Subject<Def, Value>);
				needsUpdate = true;
			} else if (def !== observer.getDef()) {
				observer.update(def);
				needsUpdate = true;
			}
		}

		for (let i = this._observers.length; i >= 0; i--) {
			if (removed.has(i)) {
				this._remove(i);
			}
		}

		for (const add of added) {
			this._add(add);
		}

		if (needsUpdate) {
			this._publish();
		}
	}

	setParamsFn(paramsFn: () => Params): this {
		for (const observer of this._observers) {
			observer.setParamsFn(paramsFn);
		}
		return this;
	}

	private _add(subject: Subject<Def, Value>) {
		const observer = new RefObserver(this.name + '[]', this._documentView) as RefObserver<Def, Value>;
		observer.update(subject.def);
		this._observers.push(observer);
		this._subscriptions.push(
			observer.subscribe((next) => {
				if (!next) {
					this._remove(this._observers.indexOf(observer));
				}
				this._publish();
			}),
		);
	}

	private _remove(index: number) {
		const observer = this._observers[index];
		const unsub = this._subscriptions[index];

		unsub();
		observer.dispose();

		this._observers.splice(index, 1);
		this._subscriptions.splice(index, 1);
	}

	private _publish() {
		this.next(this._observers.map((o) => o.value!));
	}

	dispose() {
		for (const unsub of this._subscriptions) unsub();
		for (const observer of this._observers) observer.dispose();
		this._subscriptions.length = 0;
		this._observers.length = 0;
	}
}
