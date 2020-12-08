import { Accessor, Document, Extension, GLB_BUFFER, GLTF, Primitive, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
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

interface DracoWriterContext {
	primitiveHashMap: Map<Primitive, string>;
	primitiveEncodingMap: Map<string, EncodedPrimitive>;
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
			throw new Error(`[${NAME}] Please install extension dependency, "draco3d.decoder".`);
		}

		const logger = this.doc.getLogger();
		const jsonDoc = context.jsonDoc;
		const dracoMeshes: Map<number, [DRACO.Decoder, DRACO.Mesh]> = new Map();

		try {

		for (const meshDef of jsonDoc.json.meshes) {
			for (const primDef of meshDef.primitives) {
				if (!primDef.extensions || !primDef.extensions[NAME]) continue;

				const dracoDef = primDef.extensions[NAME] as DracoPrimitiveExtension;
				let [decoder, dracoMesh] = dracoMeshes.get(dracoDef.bufferView) || [];

				if (!dracoMesh) {
					const bufferViewDef = jsonDoc.json.bufferViews[dracoDef.bufferView];
					const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
					const resource = bufferDef.uri
						? jsonDoc.resources[bufferDef.uri]
						: jsonDoc.resources[GLB_BUFFER];

					const byteOffset = bufferViewDef.byteOffset || 0;
					const byteLength = bufferViewDef.byteLength;
					const compressedData = new Int8Array(resource.slice(0), byteOffset, byteLength);

					decoder = new this._decoderModule.Decoder();
					dracoMesh = decodeGeometry(decoder, compressedData);
					dracoMeshes.set(dracoDef.bufferView, [decoder, dracoMesh]);
					logger.debug(`[${NAME}] Decompressed ${compressedData.byteLength} bytes.`);
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
		}

		} finally {
			for (const [decoder, dracoMesh] of Array.from(dracoMeshes.values())) {
				this._decoderModule.destroy(decoder);
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
			throw new Error(`[${NAME}] Please install extension dependency, "draco3d.encoder".`);
		}

		const logger = this.doc.getLogger();
		logger.debug(`[${NAME}] Compression options: ${JSON.stringify(this._encoderOptions)}`);

		const primitiveHashMap = listDracoPrimitives(this.doc);
		const primitiveEncodingMap = new Map<string, EncodedPrimitive>();

		for (const prim of Array.from(primitiveHashMap.keys())) {
			const primHash = primitiveHashMap.get(prim);

			// Reuse an existing EncodedPrimitive, if possible.
			if (primitiveEncodingMap.has(primHash)) {
				primitiveEncodingMap.set(primHash, primitiveEncodingMap.get(primHash));
				continue;
			}

			// Create a new EncodedPrimitive.
			const encodedPrim = encodeGeometry(prim, this._encoderOptions);
			primitiveEncodingMap.set(primHash, encodedPrim);

			// Create indices definition, update count.
			const indicesDef = context.createAccessorDef(prim.getIndices());
			indicesDef.count = encodedPrim.numIndices;
			context.accessorIndexMap
				.set(prim.getIndices(), context.jsonDoc.json.accessors.length);
			context.jsonDoc.json.accessors.push(indicesDef);

			// Create attribute definitions, update count.
			for (const semantic of prim.listSemantics()) {
				const attribute = prim.getAttribute(semantic);
				const attributeDef = context.createAccessorDef(attribute);
				attributeDef.count = encodedPrim.numVertices;
				context.accessorIndexMap.set(attribute, context.jsonDoc.json.accessors.length)
				context.jsonDoc.json.accessors.push(attributeDef);
			}

			// Map compressed buffer view to a Buffer.
			const buffer = prim.getAttribute('POSITION').getBuffer()
				|| this.doc.getRoot().listBuffers()[0];
			if (!context.otherBufferViews.has(buffer)) context.otherBufferViews.set(buffer, []);
			context.otherBufferViews.get(buffer).push(encodedPrim.data);
		}

		logger.debug(`[${NAME}] Compressed ${primitiveHashMap.size} primitives.`);

		context.extensionData[NAME] = {
			primitiveHashMap,
			primitiveEncodingMap
		} as DracoWriterContext;

		return this;
	}

	public write(context: WriterContext): this {
		const dracoContext: DracoWriterContext = context.extensionData[NAME];
		for (const mesh of this.doc.getRoot().listMeshes()) {
			const meshDef = context.jsonDoc.json.meshes[context.meshIndexMap.get(mesh)];
			for (let i = 0; i < mesh.listPrimitives().length; i++) {
				const prim = mesh.listPrimitives()[i];
				const primDef = meshDef.primitives[i];

				const primHash = dracoContext.primitiveHashMap.get(prim);
				if (!primHash) continue;

				const encodedPrim = dracoContext.primitiveEncodingMap.get(primHash);
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

/**
 * Returns a list of Primitives compatible with Draco compression. If any required preconditions
 * fail, and would break assumptions required for compression, this function will throw an error.
 */
function listDracoPrimitives(doc: Document): Map<Primitive, string> {
	const logger = doc.getLogger();
	const included = new Set<Primitive>();
	const excluded = new Set<Primitive>();

	// Support compressing only indexed, mode=TRIANGLES primitives.
	for (const mesh of doc.getRoot().listMeshes()) {
		for (const prim of mesh.listPrimitives()) {
			if (!prim.getIndices()) {
				excluded.add(prim);
				logger.warn(`[${NAME}] Skipping Draco compression on non-indexed primitive.`);
			} else if (prim.getMode() !== GLTF.MeshPrimitiveMode.TRIANGLES) {
				excluded.add(prim);
				logger.warn(`[${NAME}] Skipping Draco compression on non-TRIANGLES primitive.`);
			} else {
				included.add(prim);
			}
		}
	}

	// Create an Accessor->index mapping.
	const accessors = doc.getRoot().listAccessors();
	const accessorIndices = new Map<Accessor, number>();
	for (let i = 0; i < accessors.length; i++) accessorIndices.set(accessors[i], i);

	// For each compressed Primitive, create a hash key identifying its accessors. Map each
	// compressed Primitive and Accessor to this hash key.
	const includedAccessors = new Map<Accessor, string>();
	const primHashKeys = new Map<Primitive, string>();
	for (const prim of Array.from(included)) {
		const hashElements = [];

		hashElements.push(accessorIndices.get(prim.getIndices()));
		for (const attribute of prim.listAttributes()) {
			hashElements.push(accessorIndices.get(attribute));
		}

		const hashKey = hashElements.sort().join('|');
		primHashKeys.set(prim, hashKey);
		includedAccessors.set(prim.getIndices(), hashKey);
		for (const attribute of prim.listAttributes()) {
			includedAccessors.set(attribute, hashKey);
		}
	}

	// For each compressed Accessor, ensure that it isn't used except by a Primitive.
	for (const accessor of Array.from(includedAccessors.keys())) {
		const parentTypes = new Set(accessor.listParents().map((prop) => prop.propertyType));
		if (parentTypes.size !== 2 || !parentTypes.has('Primitive') || !parentTypes.has('Root')) {
			throw new Error(
				`[${NAME}] Compressed accessors must only be used as indices or vertex attributes.`
			);
		}
	}

	// For each compressed Primitive, ensure that Accessors are mapped only to the same hash key.
	for (const prim of Array.from(included)) {
		const hashKey = primHashKeys.get(prim);
		if (includedAccessors.get(prim.getIndices()) !== hashKey
				|| prim.listAttributes().some((attr) => includedAccessors.get(attr) !== hashKey)) {
			throw new Error(`[${NAME}] Draco primitives must share all, or no, accessors.`)
		}
	}

	// For each excluded Primitive, ensure that no Accessors are compressed.
	for (const prim of Array.from(excluded)) {
		if (includedAccessors.has(prim.getIndices())
				|| prim.listAttributes().some((attr) => includedAccessors.has(attr))) {
			throw new Error(`[${NAME}] Accessor cannot be shared by compressed and uncompressed primitives.`);
		}
	}

	return primHashKeys;
}
