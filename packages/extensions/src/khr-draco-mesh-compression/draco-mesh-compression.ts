import { Extension, GLB_BUFFER, Primitive, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_DRACO_MESH_COMPRESSION } from '../constants';
import { DRACO } from '../types/draco3d';
import { decodeAttribute, decodeGeometry, decodeIndex, initDecoderModule } from './decoder';
import { EncodedPrimitive, EncoderMethod, EncoderOptions, encodeGeometry, initEncoderModule } from './encoder';

const NAME = KHR_DRACO_MESH_COMPRESSION;

interface DracoPrimitiveExtension {
	bufferView: number;
	attributes: {
		[name: string]: number;
	};
}

/** Documentation in {@link EXTENSIONS.md}. */
export class DracoMeshCompression extends Extension {
	public readonly extensionName = NAME;
	public readonly prereadTypes = [PropertyType.PRIMITIVE];
	public readonly prewriteTypes = [PropertyType.ACCESSOR];
	public readonly dependencies = ['draco3d.decoder', 'draco3d.encoder'];

	public static readonly EXTENSION_NAME = NAME;
	public static readonly EncoderMethod = EncoderMethod;

	private _decoderModule: DRACO.DecoderModule;
	private _encoderModule: DRACO.EncoderModule;
	private _encoderOptions: EncoderOptions = {};

	public install(key: string, dependency: unknown): this {
		if (key === 'draco3d.decoder') {
			this._decoderModule = dependency as DRACO.DecoderModule;
			initDecoderModule(this._decoderModule);
		}
		if (key === 'draco3d.encoder') {
			this._encoderModule = dependency as DRACO.EncoderModule;
			initEncoderModule(this._encoderModule);
		}
		return this;
	}

	public setEncoderOptions(options: EncoderOptions): this {
		this._encoderOptions = options;
		return this;
	}

	public preread(context: ReaderContext): this {
		if (!this._decoderModule) {
			throw new Error('Please install extension dependency, "draco3d.decoder".');
		}

		const logger = this.doc.getLogger();
		const jsonDoc = context.jsonDoc;
		const decoder = new this._decoderModule.Decoder();
		const dracoMeshes: Map<number, DRACO.Mesh> = new Map();

		for (const meshDef of jsonDoc.json.meshes) {
			for (const primDef of meshDef.primitives) {
				if (!primDef.extensions || !primDef.extensions[NAME]) continue;

				const dracoDef = primDef.extensions[NAME] as DracoPrimitiveExtension;
				let dracoMesh = dracoMeshes.get(dracoDef.bufferView);

				if (!dracoMesh) {
					const bufferViewDef = jsonDoc.json.bufferViews[dracoDef.bufferView];
					const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
					const resource = bufferDef.uri
						? jsonDoc.resources[bufferDef.uri]
						: jsonDoc.resources[GLB_BUFFER];

					const byteOffset = bufferViewDef.byteOffset || 0;
					const byteLength = bufferViewDef.byteLength;
					const compressedData = new Uint8Array(resource, byteOffset, byteLength);

					dracoMesh = decodeGeometry(decoder, compressedData);
					dracoMeshes.set(dracoDef.bufferView, dracoMesh);
					logger.debug(`Decompressed ${compressedData.byteLength} bytes.`);
				}

				// Attributes.
				for (const semantic in primDef.attributes) {
					const accessorDef =
						context.jsonDoc.json.accessors[primDef.attributes[semantic]];
					const dracoAttribute =
						decoder.GetAttributeByUniqueId(dracoMesh, dracoDef.attributes[semantic]);
					const attributeArray =
						decodeAttribute(decoder, dracoMesh, dracoAttribute, accessorDef);
					context.accessors[primDef.attributes[semantic]].setArray(attributeArray);
				}

				// Indices.
				const indicesArray = decodeIndex(decoder, dracoMesh);
				context.accessors[primDef.indices].setArray(indicesArray);
			}

			this._decoderModule.destroy(decoder);
			for (const dracoMesh of Array.from(dracoMeshes.values())) {
				this._decoderModule.destroy(dracoMesh);
			}
		}

		return this;
	}

	public read(_context: ReaderContext): this {
		return this;
	}

	public prewrite(context: WriterContext, _propertyType: PropertyType): this {
		if (!this._encoderModule) {
			throw new Error('Please install extension dependency, "draco3d.encoder".');
		}

		const primitiveEncodingMap = new Map<Primitive, EncodedPrimitive>();
		context.extensionData[NAME] = {primitiveEncodingMap};

		for (const mesh of this.doc.getRoot().listMeshes()) {
			for (const prim of mesh.listPrimitives()) {
				if (!prim.getIndices()) {
					throw new Error('Draco compression requires indexed primitives. Try "weld"?');
				}

				const encodedPrim = encodeGeometry(prim, this._encoderOptions);

				const indicesDef = context.createAccessorDef(prim.getIndices());
				indicesDef.count = encodedPrim.numIndices;
				context.accessorIndexMap
					.set(prim.getIndices(), context.jsonDoc.json.accessors.length);
				context.jsonDoc.json.accessors.push(indicesDef);

				for (const semantic of prim.listSemantics()) {
					const attribute = prim.getAttribute(semantic);
					const attributeDef = context.createAccessorDef(attribute);
					attributeDef.count = encodedPrim.numVertices;
					context.accessorIndexMap.set(attribute, context.jsonDoc.json.accessors.length)
					context.jsonDoc.json.accessors.push(attributeDef);
				}

				const buffer = prim.getAttribute('POSITION').getBuffer()
					|| this.doc.getRoot().listBuffers()[0];
				if (!context.otherBufferViews.has(buffer)) context.otherBufferViews.set(buffer, []);
				context.otherBufferViews.get(buffer).push(encodedPrim.data);
				primitiveEncodingMap.set(prim, encodedPrim);
			}
		}

		return this;
	}

	public write(context: WriterContext): this {
		// TODO(bug): Ensure that compressed accessors are not re-written elsewhere. This could be
		// nontrivial, if the same accessor is reused (e.g. for morph targets).

		for (const mesh of this.doc.getRoot().listMeshes()) {
			const meshDef = context.jsonDoc.json.meshes[context.meshIndexMap.get(mesh)];
			for (let i = 0; i < mesh.listPrimitives().length; i++) {
				const prim = mesh.listPrimitives()[i];
				const primDef = meshDef.primitives[i];
				const encodedPrim = (context.extensionData[NAME].primitiveEncodingMap as
					Map<Primitive, EncodedPrimitive>).get(prim);

				primDef.extensions = primDef.extensions || {};
				primDef.extensions[NAME] = {
					bufferView: context.otherBufferViewsIndexMap.get(encodedPrim.data),
					attributes: encodedPrim.attributeIDs,
				};
			}
		}

		return this;
	}
}
