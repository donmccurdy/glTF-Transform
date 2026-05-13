import {
	type Document,
	Extension,
	type GLTF,
	MathUtils,
	type Primitive,
	type ReaderContext,
	type WriterContext,
} from '@gltf-transform/core';
import { EXT_MESH_FEATURES, EXT_STRUCTURAL_METADATA } from '../constants.js';
import type { StructuralMetadata } from '../ext-structural-metadata/index.js';
import { FeatureID } from './feature-id.js';
import { FeatureIDTexture } from './feature-id-texture.js';
import { Features } from './features.js';

const NAME = EXT_MESH_FEATURES;

/******************************************************************************
 * Interfaces.
 */

interface MeshFeaturesDef {
	featureIds: FeatureIDDef[];
}

interface FeatureIDDef {
	featureCount: number;
	nullFeatureId?: number;
	label?: string;
	attribute?: number;
	texture?: FeatureIDTextureDef;
	propertyTable?: number;
}

interface FeatureIDTextureDef extends GLTF.ITextureInfo {
	channels?: number[];
}

/******************************************************************************
 * Implementation.
 */

/**
 * [`EXT_mesh_features`](https://github.com/CesiumGS/glTF/tree/proposal-EXT_mesh_features/extensions/2.0/Vendor/EXT_mesh_features/)
 * defines a means of assigning identifiers to geometry and subcomponents of geometry within a glTF 2.0 asset.
 *
 * Properties:
 * - {@link Features}
 * - {@link FeatureID}
 * - {@link FeatureIDTexture}
 *
 * ### Example
 *
 * ```typescript
 * // Create an Extension attached to the Document.
 * const meshFeaturesExt = document.createExtension(EXTMeshFeatures);
 *
 * // Define per-vertex Feature IDs.
 * const idArray = new Int16Array([12, 23, 34, 45, 56, 78, 78, 89, 90]);
 * const idAttribute = document.createAccessor()
 * 	.setBuffer(document.listBuffers()[0])
 * 	.setType(Accessor.Type.SCALAR)
 * 	.setArray(idArray);
 * const featureID = meshFeaturesExt.createFeatureID()
 * 	.setFeatureCount(idArray.length)
 * 	.setAttribute(0); // _FEATURE_ID_0
 *
 * // Primitives reference a set of >=1 FeatureID properties. Each property
 * // defines a mapping from a part of the Primitive to an ID.
 * const features = meshFeaturesExt.createMeshFeatures()
 * 	.addFeatureID(featureID);
 *
 * // Assign FeatureID properties to the Primitive.
 * primitive
 * 	.setAttribute(`_FEATURE_ID_0`, idAttribute)
 * 	.setExtension("EXT_mesh_features", features);
 * ```
 *
 * @experimental
 */
export class EXTMeshFeatures extends Extension {
	public override readonly extensionName = EXT_MESH_FEATURES;
	public static override EXTENSION_NAME = EXT_MESH_FEATURES;

	createFeatures() {
		return new Features(this.document.getGraph());
	}

	createFeatureID() {
		return new FeatureID(this.document.getGraph());
	}

	createFeatureIDTexture() {
		return new FeatureIDTexture(this.document.getGraph());
	}

	public override read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const meshDefs = jsonDoc.json.meshes || [];
		meshDefs.forEach((meshDef, meshIndex) => {
			const primDefs = meshDef.primitives || [];
			primDefs.forEach((primDef, primIndex) => {
				this._readPrimitive(context, meshIndex, primDef, primIndex);
			});
		});
		return this;
	}

	/** @hidden */
	private _readPrimitive(context: ReaderContext, meshIndex: number, primDef: GLTF.IMeshPrimitive, primIndex: number) {
		if (!primDef.extensions || !primDef.extensions[NAME]) {
			return;
		}

		const features = this.createFeatures();

		const meshFeaturesDef = primDef.extensions[NAME] as MeshFeaturesDef;
		for (const featureIDDef of meshFeaturesDef.featureIds) {
			const featureID = _readFeatureID(this.document, this, context, featureIDDef);
			features.addFeatureID(featureID);
		}

		const mesh = context.meshes[meshIndex];
		mesh.listPrimitives()[primIndex].setExtension(NAME, features);
	}

	public override write(context: WriterContext): this {
		const jsonDoc = context.jsonDoc;
		const meshDefs = jsonDoc.json.meshes;
		if (!meshDefs) {
			return this;
		}

		for (const mesh of this.document.getRoot().listMeshes()) {
			const meshIndex = context.meshIndexMap.get(mesh)!;
			const meshDef = meshDefs[meshIndex];
			mesh.listPrimitives().forEach((prim, primIndex) => {
				const primDef = meshDef.primitives[primIndex];
				this._writePrimitive(context, prim, primDef);
			});
		}
		return this;
	}

	/** @hidden */
	private _writePrimitive(context: WriterContext, prim: Primitive, primDef: GLTF.IMeshPrimitive) {
		const meshFeatures = prim.getExtension<Features>(NAME);
		if (!meshFeatures) {
			return;
		}

		const meshFeaturesDef = { featureIds: [] } as MeshFeaturesDef;
		meshFeatures.listFeatureIDs().forEach((featureID) => {
			meshFeaturesDef.featureIds.push(_writeFeatureIDDef(this.document, context, featureID));
		});

		primDef.extensions = primDef.extensions || {};
		primDef.extensions[NAME] = meshFeaturesDef;
	}
}

/******************************************************************************
 * Deserialization.
 */

function _readFeatureID(document: Document, ext: EXTMeshFeatures, context: ReaderContext, featureIDDef: FeatureIDDef) {
	const featureID = ext.createFeatureID().setFeatureCount(featureIDDef.featureCount);

	if (featureIDDef.nullFeatureId !== undefined) {
		featureID.setNullFeatureID(featureIDDef.nullFeatureId);
	}
	if (featureIDDef.label !== undefined) {
		featureID.setLabel(featureIDDef.label);
	}
	if (featureIDDef.attribute !== undefined) {
		featureID.setAttribute(featureIDDef.attribute);
	}

	const featureIDTextureDef = featureIDDef.texture;
	if (featureIDTextureDef !== undefined) {
		const featureIDTexture = _readFeatureIDTexture(ext, context, featureIDTextureDef);
		featureID.setTexture(featureIDTexture);
	}

	if (featureIDDef.propertyTable !== undefined) {
		const structuralMetadata = document.getRoot().getExtension<StructuralMetadata>(EXT_STRUCTURAL_METADATA)!;
		const propertyTables = structuralMetadata.listPropertyTables();
		featureID.setPropertyTable(propertyTables[featureIDDef.propertyTable]);
	}

	return featureID;
}

function _readFeatureIDTexture(ext: EXTMeshFeatures, context: ReaderContext, featureIDTextureDef: FeatureIDTextureDef) {
	const featureIDTexture = ext.createFeatureIDTexture();

	const { json } = context.jsonDoc;

	if (featureIDTextureDef.channels) {
		featureIDTexture.setChannels(featureIDTextureDef.channels);
	}

	if (featureIDTextureDef.index !== undefined) {
		const textureIndex = json.textures![featureIDTextureDef.index].source!;
		featureIDTexture.setTexture(context.textures[textureIndex]);
		context.setTextureInfo(featureIDTexture.getTextureInfo()!, featureIDTextureDef);
	}

	return featureIDTexture;
}

/******************************************************************************
 * Serialization.
 */

function _writeFeatureIDDef(document: Document, context: WriterContext, featureID: FeatureID): FeatureIDDef {
	const root = document.getRoot();

	const featureIDDef: FeatureIDDef = {
		featureCount: featureID.getFeatureCount(),
	};

	if (featureID.getNullFeatureID() != null) {
		featureIDDef.nullFeatureId = featureID.getNullFeatureID()!;
	}

	if (featureID.getLabel() != null) {
		featureIDDef.label = featureID.getLabel()!;
	}

	if (featureID.getAttribute() != null) {
		featureIDDef.attribute = featureID.getAttribute()!;
	}

	if (featureID.getTexture()) {
		const featureIDTexture = featureID.getTexture()!;
		const texture = featureIDTexture.getTexture()!;
		const textureInfo = featureIDTexture.getTextureInfo()!;

		featureIDDef.texture = context.createTextureInfoDef(texture, textureInfo);

		const channels = featureIDTexture.getChannels();
		if (!MathUtils.eq(channels, [0])) {
			featureIDDef.texture.channels = channels;
		}
	}

	if (featureID.getPropertyTable()) {
		const structuralMetadata = root.getExtension<StructuralMetadata>(EXT_STRUCTURAL_METADATA)!;
		const propertyTable = featureID.getPropertyTable()!;
		featureIDDef.propertyTable = structuralMetadata.listPropertyTables().indexOf(propertyTable);
	}

	return featureIDDef;
}
