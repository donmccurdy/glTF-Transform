import { Bone, BufferAttribute, Matrix4, Skeleton } from 'three';
import { Accessor as AccessorDef, Node as NodeDef, Skin as SkinDef } from '@gltf-transform/core';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import { Subject } from './Subject.js';
import { RefListObserver, RefObserver } from '../observers/index.js';
import { ValuePool } from '../pools/index.js';

/**
 * SkinSubject transforms `nodeDef.skin` into a THREE.Skeleton instance. The upstream
 * {@link NodeSubject} will bind the skeleton to the mesh, where {@link PrimitiveSubject}
 * is responsible for emitting a THREE.SkinnedMesh if it contains skinning-related attributes.
 *
 * This subject does not guard against certain invalid states — missing bones, missing
 * vertex weights — and should be used accordingly.
 *
 * @internal
 */
export class SkinSubject extends Subject<SkinDef, Skeleton> {
	protected joints = new RefListObserver<NodeDef, Bone>('children', this._documentView);
	protected inverseBindMatrices = new RefObserver<AccessorDef, BufferAttribute>(
		'inverseBindMatrices',
		this._documentView,
	);

	/** Output (Skeleton) is never cloned by an observer. */
	protected _outputSingleton = true;

	constructor(documentView: DocumentViewSubjectAPI, def: SkinDef) {
		super(documentView, def, SkinSubject.createValue(def, [], null, documentView.skinPool), documentView.skinPool);

		this.joints.subscribe((joints) => {
			this.pool.releaseBase(this.value);
			this.value = SkinSubject.createValue(def, joints, this.inverseBindMatrices.value, this.pool);
			this.publishAll();
		});
		this.inverseBindMatrices.subscribe((inverseBindMatrices) => {
			this.pool.releaseBase(this.value);
			this.value = SkinSubject.createValue(def, this.joints.value, inverseBindMatrices, this.pool);
			this.publishAll();
		});
	}

	private static createValue(
		_def: SkinDef,
		bones: Bone[],
		ibm: BufferAttribute | null,
		pool: ValuePool<Skeleton>,
	): Skeleton {
		const boneInverses: Matrix4[] = [];

		for (let i = 0; i < bones.length; i++) {
			const matrix = new Matrix4();
			if (ibm) matrix.fromArray(ibm.array, i * 16);
			boneInverses.push(matrix);
		}

		return pool.requestBase(new Skeleton(bones, boneInverses));
	}

	update() {
		this.joints.update(this.def.listJoints());
		this.inverseBindMatrices.update(this.def.getInverseBindMatrices());
	}

	dispose() {
		this.joints.dispose();
		this.inverseBindMatrices.dispose();
		super.dispose();
	}
}
