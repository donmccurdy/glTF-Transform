import {
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

//============================================================================
// Interfaces for the JSON structure
//
// These interfaces reflect the structure of the JSON input, and can be
// derived directly from the JSON schema of the extension.
//
// The naming convention for these interfaces (and variables that refer
// to them) is that they end with `...Def`.
//
// In the 'read' method of the Extension class, they will be obtained
// from the `context.jsonDoc.json` in raw form, and translated into
// the "model" classes that are defined as
//   export class MeshFeatures extends ExtensionProperty<IMeshFeatures> {...}
//
// Note that textures are represented as a `GLTF.ITextureInfo`, with
// the `index` and `texCoord` properties. The "model" classes offer
// this as a `TextureInfo` object that is associated with the `Texture`
// object. This is used internally by glTF-Transform, to automatically
// do some sort of deduplication magic.
//
// In the 'write' method of the Extension class, these objects will be
// created from the "model" classes, and inserted into the JSON structure
// from the `context.jsonDoc.json`.
//
// The `GLTF.ITextureInfo` objects will be created with
// `context.createTextureInfoDef`, based on the `Texture´ and
// `TextureInfo` object from the model class.
//
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
//============================================================================

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
 * const document = new Document();
 *
 * // Create an Extension attached to the Document.
 * const meshFeaturesExt = document.createExtension(EXTMeshFeatures);
 *
 * // Define an array of IDs
 * const ids = [ 12, 23, 34, 45, 56, 78, 78, 89, 90 ];
 *
 * // Put the IDs into an `Accessor`
 * const buffer = document.createBuffer();
 * const accessor = document.createAccessor();
 * accessor.setBuffer(buffer);
 * accessor.setType(Accessor.Type.SCALAR);
 * accessor.setArray(new Int16Array(ids));
 *
 * // Create a mesh `Primitive`
 * const primitive = document.createPrimitive();
 *
 * // Set the IDs as one attribute of the `Primitive`
 * const attributeNumber = 2;
 * primitive.setAttribute(`_FEATURE_ID_${attributeNumber}`, accessor);
 *
 * // Create a `FeatureId` object. This object indicates that the IDs
 * // are stored in the attribute `_FEATURE_ID_${attributeNumber}`
 * const featureID = meshFeaturesExt.createFeatureID();
 * featureID.setFeatureCount(new Set(ids).size);
 * featureID.setAttribute(attributeNumber);
 *
 * // Create a `Features` object that contains the
 * // created `FeatureID`, and store it as an extension
 * // object in the `Primitive`
 * const features = meshFeaturesExt.createMeshFeatures();
 * features.addFeatureID(featureID);
 * primitive.setExtension("EXT_mesh_features", features);
 *
 * // Assign the `Primitive` to a `Mesh`
 * const mesh = document.createMesh();
 * mesh.addPrimitive(primitive);
 *
 * // Create an IO object and register the extension
 * const io = new NodeIO();
 * io.registerExtensions([EXTMeshFeatures]);
 *
 * // Write the document as JSON
 * const written = await io.writeJSON(document);
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

	createFeatureId() {
		return new FeatureID(this.document.getGraph());
	}

	createFeatureIdTexture() {
		return new FeatureIDTexture(this.document.getGraph());
	}

	public override read(context: ReaderContext): this {
		const jsonDoc = context.jsonDoc;
		const meshDefs = jsonDoc.json.meshes || [];
		meshDefs.forEach((meshDef, meshIndex) => {
			const primDefs = meshDef.primitives || [];
			primDefs.forEach((primDef, primIndex) => {
				this.readPrimitive(context, meshIndex, primDef, primIndex);
			});
		});
		return this;
	}

	private readPrimitive(context: ReaderContext, meshIndex: number, primDef: GLTF.IMeshPrimitive, primIndex: number) {
		if (!primDef.extensions || !primDef.extensions[NAME]) {
			return;
		}

		const features = this.createFeatures();

		const meshFeaturesDef = primDef.extensions[NAME] as MeshFeaturesDef;
		for (const featureIDDef of meshFeaturesDef.featureIds) {
			const featureID = this.createFeatureId();
			this.readFeatureID(context, featureID, featureIDDef);
			features.addFeatureID(featureID);
		}

		const mesh = context.meshes[meshIndex];
		mesh.listPrimitives()[primIndex].setExtension(NAME, features);
	}

	private readFeatureID(context: ReaderContext, featureID: FeatureID, featureIDDef: FeatureIDDef) {
		featureID.setFeatureCount(featureIDDef.featureCount);

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
			const featureIDTexture = this.createFeatureIdTexture();
			this.readFeatureIDTexture(context, featureIDTexture, featureIDTextureDef);
			featureID.setTexture(featureIDTexture);
		}

		if (featureIDDef.propertyTable !== undefined) {
			const root = this.document.getRoot();
			const structuralMetadata = root.getExtension<StructuralMetadata>(EXT_STRUCTURAL_METADATA);
			if (!structuralMetadata) {
				throw new Error(`${NAME}: Missing EXT_structural_metadata root extension.`);
			}

			const propertyTables = structuralMetadata.listPropertyTables();
			const propertyTable = propertyTables[featureIDDef.propertyTable];
			featureID.setPropertyTable(propertyTable);
		}
	}

	private readFeatureIDTexture(
		context: ReaderContext,
		featureIDTexture: FeatureIDTexture,
		featureIDTextureDef: FeatureIDTextureDef,
	) {
		const jsonDoc = context.jsonDoc;
		const textureDefs = jsonDoc.json.textures || [];

		if (featureIDTextureDef.channels) {
			featureIDTexture.setChannels(featureIDTextureDef.channels);
		}

		const source = textureDefs[featureIDTextureDef.index].source;
		if (source !== undefined) {
			const texture = context.textures[source];
			featureIDTexture.setTexture(texture);
			context.setTextureInfo(featureIDTexture.getTextureInfo()!, featureIDTextureDef);
		}
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
				this.writePrimitive(context, prim, primDef);
			});
		}
		return this;
	}

	private writePrimitive(context: WriterContext, prim: Primitive, primDef: GLTF.IMeshPrimitive) {
		const meshFeatures = prim.getExtension<Features>(NAME);
		if (!meshFeatures) {
			return;
		}

		const meshFeaturesDef = { featureIds: [] } as MeshFeaturesDef;
		meshFeatures.listFeatureIDs().forEach((featureID) => {
			const featureIDDef = this.createFeatureIDDef(context, featureID);
			meshFeaturesDef.featureIds.push(featureIDDef);
		});

		primDef.extensions = primDef.extensions || {};
		primDef.extensions[NAME] = meshFeaturesDef;
	}

	private createFeatureIDDef(context: WriterContext, featureID: FeatureID): FeatureIDDef {
		let textureDef: FeatureIDTextureDef | undefined;
		const featureIDTexture = featureID.getTexture();
		if (featureIDTexture) {
			const texture = featureIDTexture.getTexture();
			const textureInfo = featureIDTexture.getTextureInfo();
			if (texture && textureInfo) {
				const textureInfoDef = context.createTextureInfoDef(texture, textureInfo);
				const channels = featureIDTexture.getChannels();
				textureDef = {
					index: textureInfoDef.index,
					texCoord: textureInfoDef.texCoord,
					channels: MathUtils.eq(channels, [0]) ? undefined : channels,
				};
			}
		}

		let propertyTableDef: number | undefined;
		const propertyTable = featureID.getPropertyTable();
		if (propertyTable) {
			const root = this.document.getRoot();
			const structuralMetadata = root.getExtension<StructuralMetadata>(EXT_STRUCTURAL_METADATA);
			if (!structuralMetadata) {
				throw new Error(`${NAME}: Missing EXT_structural_metadata root extension.`);
			}
			const propertyTables = structuralMetadata.listPropertyTables();
			propertyTableDef = propertyTables.indexOf(propertyTable);
		}

		const featureIDDef: FeatureIDDef = {
			featureCount: featureID.getFeatureCount(),
			nullFeatureId: featureID.getNullFeatureID() ?? undefined,
			label: featureID.getLabel() ?? undefined,
			attribute: featureID.getAttribute() ?? undefined,
			texture: textureDef,
			propertyTable: propertyTableDef,
		};

		return featureIDDef;
	}
}
