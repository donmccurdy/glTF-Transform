import { Property as PropertyDef } from '@gltf-transform/core';
import { Output } from '../observers/index.js';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import type { Subscription, THREEObject } from '../constants.js';
import { EmptyParams, ValuePool } from '../pools/index.js';

/**
 * Implementation of BehaviorSubject pattern, emitting three.js objects when changes
 * occur in glTF definitions.
 *
 * Each glTF definition (e.g. `Material`) is bound to a single Subject (e.g. `MaterialSubject`).
 * The Subject is responsible for receiving change events published by the definition, generating a
 * derived three.js object (e.g. `THREE.Material`), and publishing the new value to all Observers. More
 * precisely, this is a [*BehaviorSubject*](https://reactivex.io/documentation/subject.html), which holds
 * a single current value at any given time.
 *
 * @internal
 */
export abstract class Subject<Def extends PropertyDef, Value, Params extends EmptyParams = EmptyParams> {
	def: Def;
	value: Value;
	pool: ValuePool<Value, Params>;

	protected _documentView: DocumentViewSubjectAPI;
	protected _subscriptions: Subscription[] = [];
	protected _outputs = new Set<Output<Value>>();
	protected _outputParamsFns = new Map<Output<Value>, () => Params>();

	/**
	 * Indicates that the output value of this subject is a singleton, and will not
	 * be cloned by any observer. For some types (NodeSubject), declaring this can
	 * avoid the need to republish after an in-place update to the value.
	 */
	protected _outputSingleton = false;

	protected constructor(documentView: DocumentViewSubjectAPI, def: Def, value: Value, pool: ValuePool<Value>) {
		this._documentView = documentView;
		this.def = def;
		this.value = value;
		this.pool = pool;

		const onChange = () => {
			const prevValue = this.value;
			this.update();
			if (this.value !== prevValue || !this._outputSingleton) {
				this.publishAll();
			}
		};
		const onDispose = () => this.dispose();

		def.addEventListener('change', onChange);
		def.addEventListener('dispose', onDispose);

		this._subscriptions.push(
			() => def.removeEventListener('change', onChange),
			() => def.removeEventListener('dispose', onDispose),
		);
	}

	/**************************************************************************
	 * Lifecycle.
	 */

	// TODO(perf): Many publishes during an update (e.g. Material). Consider batching or scheduling.
	abstract update(): void;

	publishAll(): void {
		// Prevent publishing updates during disposal.
		if (this._documentView.isDisposed()) return;

		for (const output of this._outputs) {
			this.publish(output);
		}
	}

	publish(output: Output<Value>): void {
		// Prevent publishing updates during disposal, which would cause loops.
		if (this._documentView.isDisposed()) return;

		if (output.value) {
			this.pool.releaseVariant(output.value);
		}

		// Map value to the requirements associated with the output.
		const paramsFn = this._outputParamsFns.get(output)!;
		const value = this.pool.requestVariant(this.value, paramsFn());

		// Record for lookups before advancing the value. SingleUserPool
		// requires this order to preserve PrimitiveDef output lookups.
		this._documentView.recordOutputValue(this.def, value as unknown as THREEObject);

		// Advance next value.
		output.next(value);
	}

	dispose(): void {
		for (const unsub of this._subscriptions) unsub();
		if (this.value) {
			this.pool.releaseBase(this.value);
		}

		for (const output of this._outputs) {
			const value = output.value;
			output.detach();
			output.next(null);
			if (value) this.pool.releaseVariant(value);
		}
	}

	/**************************************************************************
	 * Output API — Used by RefObserver.ts
	 */

	/**
	 * Adds an output, which will receive future published values.
	 * _Only for use of RefObserver.ts._
	 */
	addOutput(output: Output<Value>, paramsFn: () => Params) {
		this._outputs.add(output);
		this._outputParamsFns.set(output, paramsFn);
	}

	/**
	 * Removes an output, which will no longer receive published values.
	 * _Only for use of RefObserver.ts._
	 */
	removeOutput(output: Output<Value>) {
		const value = output.value;
		this._outputs.delete(output);
		this._outputParamsFns.delete(output);
		if (value) this.pool.releaseVariant(value);
	}
}
