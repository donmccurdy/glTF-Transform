import type { Property as PropertyDef } from '@gltf-transform/core';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import type { Subject } from '../subjects/index.js';
import { Observable } from '../utils/index.js';
import { EmptyParams } from '../pools/index.js';

/**
 * Exposes a limited view of the RefObserver interface to objects
 * using it as an output socket.
 */
export interface Output<Value> extends Observable<Value | null> {
	detach(): void;
}

/**
 * Observable connecting one Subject's output to another Subject's input.
 *
 * An Observer is subscribed to the values published by a particular Subject, and
 * passes those events along to a parent — usually another Subject. For example, a MaterialSubject
 * subscribes to updates from a TextureSubject using an Observer. Observers are parameterized:
 * for example, a single Texture may be used by many Materials, with different offset/scale/encoding
 * parameters in each. The TextureSubject treats each of these Observers as a different "output", and
 * uses the parameters associated with the Observer to publish the appropriate value.
 *
 * RefObserver should let the Subject call .next(), generally avoiding calling .next() itself. The
 * RefObserver is a passive pipe.
 *
 * @internal
 */
export class RefObserver<Def extends PropertyDef, Value, Params extends EmptyParams = EmptyParams>
	extends Observable<Value | null>
	implements Output<Value>
{
	readonly name: string;

	private _subject: Subject<Def, Value> | null = null;
	private _subjectParamsFn: () => Params = () => ({}) as Params;

	private readonly _documentView: DocumentViewSubjectAPI;

	constructor(name: string, documentView: DocumentViewSubjectAPI) {
		super(null);
		this.name = name;
		this._documentView = documentView;
	}

	/**************************************************************************
	 * Child interface. (Subject (Child))
	 */

	detach() {
		this._clear();
	}

	next(value: Value | null) {
		// Prevent publishing updates during disposal.
		if (this._documentView.isDisposed()) return;

		super.next(value);
	}

	/**************************************************************************
	 * Parent interface. (Subject (Parent), ListObserver, MapObserver)
	 */

	setParamsFn(paramsFn: () => Params): this {
		this._subjectParamsFn = paramsFn;
		return this;
	}

	getDef(): Def | null {
		return this._subject ? this._subject.def : null;
	}

	update(def: Def | null) {
		const subject = def ? (this._documentView.bind(def) as Subject<Def, Value>) : null;
		if (subject === this._subject) return;

		this._clear();

		if (subject) {
			this._subject = subject;
			this._subject.addOutput(this, this._subjectParamsFn);
			this._subject.publish(this);
		} else {
			// In most cases RefObserver should let the Subject call .next() itself,
			// but this is the exception since the Subject is gone.
			this.next(null);
		}
	}

	/**
	 * Forces the observed Subject to re-evaluate the output. For use when
	 * output parameters are likely to have changed.
	 */
	invalidate() {
		if (this._subject) {
			this._subject.publish(this);
		}
	}

	dispose() {
		this._clear();
	}

	/**************************************************************************
	 * Internal.
	 */

	private _clear() {
		if (this._subject) {
			this._subject.removeOutput(this);
			this._subject = null;
		}
	}
}
