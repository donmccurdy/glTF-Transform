import {
	Accessor,
	bbox,
	getBounds,
	BufferUtils,
	Document,
	Extension,
	GLB_BUFFER,
	Primitive,
	PropertyType,
	ReaderContext,
	WriterContext,
} from '@gltf-transform/core';
import { decodeAttribute, decodeGeometry, decodeIndex, initDecoderModule } from './decoder.js';
import {
	EncodedPrimitive,
	encodeGeometry,
	EncoderMethod,
	EncoderOptions,
	EncodingError,
	initEncoderModule,
} from './encoder.js';
import { KHR_DRACO_MESH_COMPRESSION } from '../constants.js';
import type { Decoder, DecoderModule, EncoderModule, Mesh } from 'draco3dgltf';

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

/**
 * # KHRDracoMeshCompression
 *
 * [`KHR_draco_mesh_compression`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_draco_mesh_compression/)
 * provides advanced compression for mesh geometry.
 *
 * For models where geometry is a significant factor (>1 MB), Draco can reduce filesize by ~95%
 * in many cases. When animation or textures are large, other complementary compression methods
 * should be used as well. For geometry <1MB, the size of the WASM decoder library may outweigh
 * size savings.
 *
 * Be aware that decompression happens before uploading to the GPU — this will add some latency to
 * the parsing process, and means that compressing geometry with  Draco does _not_ affect runtime
 * performance. To improve framerate, you'll need to simplify the geometry by reducing vertex count
 * or draw calls — not just compress it. Finally, be aware that Draco compression is lossy:
 * repeatedly compressing and decompressing a model in a pipeline will lose precision, so
 * compression should generally be the last stage of an art workflow, and uncompressed original
 * files should be kept.
 *
 * A decoder or encoder from the `draco3dgltf` npm module for Node.js (or
 * [elsewhere for web](https://stackoverflow.com/a/66978236/1314762)) is required for reading and writing,
 * and must be provided by the application.
 *
 * ### Encoding options
 *
 * Two compression methods are available: 'edgebreaker' and 'sequential'. The
 * edgebreaker method will give higher compression in general, but changes the
 * order of the model's vertices. To preserve index order, use sequential
 * compression. When a mesh uses morph targets, or a high decoding speed is
 * selected, sequential compression will automatically be chosen.
 *
 * Both speed options affect the encoder's choice of algorithms. For example, a
 * requirement for fast decoding may prevent the encoder from using the best
 * compression methods even if the encoding speed is set to 0. In general, the
 * faster of the two options limits the choice of features that can be used by the
 * encoder. Setting --decodeSpeed to be faster than the --encodeSpeed may allow
 * the encoder to choose the optimal method out of the available features for the
 * given --decodeSpeed.
 *
 * ### Example
 *
 * ```typescript
 * import { NodeIO } from '@gltf-transform/core';
 * import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
 *
 * import draco3d from 'draco3dgltf';
 *
 * // ...
 *
 * const io = new NodeIO()
 *	.registerExtensions([KHRDracoMeshCompression])
 *	.registerDependencies({
 *		'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
 *		'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
 *	});
 *
 * // Read and decode.
 * const document = await io.read('compressed.glb');
 *
 * // Write and encode.
 * document.createExtension(KHRDracoMeshCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({
 * 		method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
 * 		encodeSpeed: 5,
 * 		decodeSpeed: 5,
 * 	});
 * await io.write('compressed.glb', document);
 * ```
 */
export class KHRDracoMeshCompression extends Extension {
	public readonly extensionName = NAME;
	/** @hidden */
	public readonly prereadTypes = [PropertyType.PRIMITIVE];
	/** @hidden */
	public readonly prewriteTypes = [PropertyType.ACCESSOR];
	/** @hidden */
	public readonly readDependencies = ['draco3d.decoder'];
	/** @hidden */
	public readonly writeDependencies = ['draco3d.encoder'];

	public static readonly EXTENSION_NAME = NAME;

	/**
	 * Compression method. `EncoderMethod.EDGEBREAKER` usually provides a higher compression ratio,
	 * while `EncoderMethod.SEQUENTIAL` better preserves original verter order.
	 */
	public static readonly EncoderMethod = EncoderMethod;

	private _decoderModule: DecoderModule | null = null;
	private _encoderModule: EncoderModule | null = null;
	private _encoderOptions: EncoderOptions = {};

	/** @hidden */
	public install(key: string, dependency: unknown): this {
		if (key === 'draco3d.decoder') {
			this._decoderModule = dependency as DecoderModule;
			initDecoderModule(this._decoderModule);
		}
		if (key === 'draco3d.encoder') {
			this._encoderModule = dependency as EncoderModule;
			initEncoderModule(this._encoderModule);
		}
		return this;
	}

	/**
	 * Sets Draco compression options. Compression does not take effect until the Document is
	 * written with an I/O class.
	 *
	 * Defaults:
	 * ```
	 * decodeSpeed?: number = 5;
	 * encodeSpeed?: number = 5;
	 * method?: EncoderMethod = EncoderMethod.EDGEBREAKER;
	 * quantizationBits?: {[ATTRIBUTE_NAME]: bits};
	 * quantizationVolume?: 'mesh' | 'scene' | bbox = 'mesh';
	 * ```
	 */
	public setEncoderOptions(options: EncoderOptions): this {
		this._encoderOptions = options;
		return this;
	}

	/** @hidden */
	public preread(context: ReaderContext): this {
		if (!this._decoderModule) {
			throw new Error(`[${NAME}] Please install extension dependency, "draco3d.decoder".`);
		}

		const logger = this.document.getLogger();
		const jsonDoc = context.jsonDoc;
		const dracoMeshes: Map<number, [Decoder, Mesh]> = new Map();

		try {
			const meshDefs = jsonDoc.json.meshes || [];
			for (const meshDef of meshDefs) {
				for (const primDef of meshDef.primitives) {
					if (!primDef.extensions || !primDef.extensions[NAME]) continue;

					const dracoDef = primDef.extensions[NAME] as DracoPrimitiveExtension;
					let [decoder, dracoMesh] = dracoMeshes.get(dracoDef.bufferView) || [];

					if (!dracoMesh || !decoder) {
						const bufferViewDef = jsonDoc.json.bufferViews![dracoDef.bufferView];
						const bufferDef = jsonDoc.json.buffers![bufferViewDef.buffer];
						// TODO(cleanup): Should be encapsulated in writer-context.ts.
						const resource = bufferDef.uri
							? jsonDoc.resources[bufferDef.uri]
							: jsonDoc.resources[GLB_BUFFER];

						const byteOffset = bufferViewDef.byteOffset || 0;
						const byteLength = bufferViewDef.byteLength;
						const compressedData = BufferUtils.toView(resource, byteOffset, byteLength);

						decoder = new this._decoderModule.Decoder();
						dracoMesh = decodeGeometry(decoder, compressedData);
						dracoMeshes.set(dracoDef.bufferView, [decoder, dracoMesh]);
						logger.debug(`[${NAME}] Decompressed ${compressedData.byteLength} bytes.`);
					}

					// Attributes.
					for (const semantic in primDef.attributes) {
						const accessorDef = context.jsonDoc.json.accessors![primDef.attributes[semantic]];
						const dracoAttribute = decoder.GetAttributeByUniqueId(dracoMesh, dracoDef.attributes[semantic]);
						const attributeArray = decodeAttribute(decoder, dracoMesh, dracoAttribute, accessorDef);
						context.accessors[primDef.attributes[semantic]].setArray(attributeArray);
					}

					// Indices. Optional, see https://github.com/google/draco/issues/720.
					if (primDef.indices !== undefined) {
						context.accessors[primDef.indices].setArray(decodeIndex(decoder, dracoMesh));
					}
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

	/** @hidden */
	public read(_context: ReaderContext): this {
		return this;
	}

	/** @hidden */
	public prewrite(context: WriterContext, _propertyType: PropertyType): this {
		if (!this._encoderModule) {
			throw new Error(`[${NAME}] Please install extension dependency, "draco3d.encoder".`);
		}

		const logger = this.document.getLogger();
		logger.debug(`[${NAME}] Compression options: ${JSON.stringify(this._encoderOptions)}`);

		const primitiveHashMap = listDracoPrimitives(this.document);
		const primitiveEncodingMap = new Map<string, EncodedPrimitive>();

		let quantizationVolume: bbox | 'mesh' = 'mesh';
		if (this._encoderOptions.quantizationVolume === 'scene') {
			if (this.document.getRoot().listScenes().length !== 1) {
				logger.warn(`[${NAME}]: quantizationVolume=scene requires exactly 1 scene.`);
			} else {
				quantizationVolume = getBounds(this.document.getRoot().listScenes().pop()!);
			}
		}

		for (const prim of Array.from(primitiveHashMap.keys())) {
			const primHash = primitiveHashMap.get(prim);
			if (!primHash) throw new Error('Unexpected primitive.');

			// Reuse an existing EncodedPrimitive, if possible.
			if (primitiveEncodingMap.has(primHash)) {
				primitiveEncodingMap.set(primHash, primitiveEncodingMap.get(primHash)!);
				continue;
			}

			const indices = prim.getIndices()!; // Condition for listDracoPrimitives().
			const accessorDefs = context.jsonDoc.json.accessors!;

			// Create a new EncodedPrimitive.
			let encodedPrim: EncodedPrimitive;
			try {
				encodedPrim = encodeGeometry(prim, { ...this._encoderOptions, quantizationVolume });
			} catch (e) {
				if (e instanceof EncodingError) {
					logger.warn(`[${NAME}]: ${e.message} Skipping primitive compression.`);
					continue;
				}
				throw e;
			}

			primitiveEncodingMap.set(primHash, encodedPrim);

			// Create indices definition, update count.
			const indicesDef = context.createAccessorDef(indices);
			indicesDef.count = encodedPrim.numIndices;
			context.accessorIndexMap.set(indices, accessorDefs.length);
			accessorDefs.push(indicesDef);

			// Create attribute definitions, update count.
			for (const semantic of prim.listSemantics()) {
				const attribute = prim.getAttribute(semantic)!;
				if (encodedPrim.attributeIDs[semantic] === undefined) continue; // sparse

				const attributeDef = context.createAccessorDef(attribute);
				attributeDef.count = encodedPrim.numVertices;
				context.accessorIndexMap.set(attribute, accessorDefs.length);
				accessorDefs.push(attributeDef);
			}

			// Map compressed buffer view to a Buffer.
			const buffer = prim.getAttribute('POSITION')!.getBuffer() || this.document.getRoot().listBuffers()[0];
			if (!context.otherBufferViews.has(buffer)) context.otherBufferViews.set(buffer, []);
			context.otherBufferViews.get(buffer)!.push(encodedPrim.data);
		}

		logger.debug(`[${NAME}] Compressed ${primitiveHashMap.size} primitives.`);

		context.extensionData[NAME] = {
			primitiveHashMap,
			primitiveEncodingMap,
		} as DracoWriterContext;

		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const dracoContext: DracoWriterContext = context.extensionData[NAME] as DracoWriterContext;

		for (const mesh of this.document.getRoot().listMeshes()) {
			const meshDef = context.jsonDoc.json.meshes![context.meshIndexMap.get(mesh)!];
			for (let i = 0; i < mesh.listPrimitives().length; i++) {
				const prim = mesh.listPrimitives()[i];
				const primDef = meshDef.primitives[i];

				const primHash = dracoContext.primitiveHashMap.get(prim);
				if (!primHash) continue;

				const encodedPrim = dracoContext.primitiveEncodingMap.get(primHash)!;
				if (!encodedPrim) continue;

				primDef.extensions = primDef.extensions || {};
				primDef.extensions[NAME] = {
					bufferView: context.otherBufferViewsIndexMap.get(encodedPrim.data),
					attributes: encodedPrim.attributeIDs,
				};
			}
		}

		// Omit the extension if nothing was compressed.
		if (!dracoContext.primitiveHashMap.size) {
			const json = context.jsonDoc.json;
			json.extensionsUsed = (json.extensionsUsed || []).filter((name) => name !== NAME);
			json.extensionsRequired = (json.extensionsRequired || []).filter((name) => name !== NAME);
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
			} else if (prim.getMode() !== Primitive.Mode.TRIANGLES) {
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
	const includedHashKeys = new Set<string>();
	const primToHashKey = new Map<Primitive, string>();
	for (const prim of Array.from(included)) {
		let hashKey = createHashKey(prim, accessorIndices);

		// If accessors of an identical primitive have already been checked, we're done.
		if (includedHashKeys.has(hashKey)) {
			primToHashKey.set(prim, hashKey);
			continue;
		}

		// If any accessors are already in use, but the same hashKey hasn't been written, then we
		// need to create copies of these accessors for the current encoded primitive. We can't
		// reuse the same compressed accessor for two encoded primitives, because Draco might
		// change the vertex count, change the vertex order, or cause other conflicts.
		if (includedAccessors.has(prim.getIndices()!)) {
			const indices = prim.getIndices()!; // Condition for 'included' list.
			const dstIndices = indices.clone();
			accessorIndices.set(dstIndices, doc.getRoot().listAccessors().length - 1);
			prim.swap(indices, dstIndices); // TODO(cleanup): I/O should not modify Document.
		}
		for (const attribute of prim.listAttributes()) {
			if (includedAccessors.has(attribute)) {
				const dstAttribute = attribute.clone();
				accessorIndices.set(dstAttribute, doc.getRoot().listAccessors().length - 1);
				prim.swap(attribute, dstAttribute); // TODO(cleanup): I/O should not modify Document.
			}
		}

		// With conflicts resolved, compute the hash key again.
		hashKey = createHashKey(prim, accessorIndices);

		// Commit the primitive and its accessors to the hash key.
		includedHashKeys.add(hashKey);
		primToHashKey.set(prim, hashKey);
		includedAccessors.set(prim.getIndices()!, hashKey);
		for (const attribute of prim.listAttributes()) {
			includedAccessors.set(attribute, hashKey);
		}
	}

	// For each compressed Accessor, ensure that it isn't used except by a Primitive.
	for (const accessor of Array.from(includedAccessors.keys())) {
		const parentTypes = new Set(accessor.listParents().map((prop) => prop.propertyType));
		if (parentTypes.size !== 2 || !parentTypes.has(PropertyType.PRIMITIVE) || !parentTypes.has(PropertyType.ROOT)) {
			throw new Error(`[${NAME}] Compressed accessors must only be used as indices or vertex attributes.`);
		}
	}

	// For each compressed Primitive, ensure that Accessors are mapped only to the same hash key.
	for (const prim of Array.from(included)) {
		const hashKey = primToHashKey.get(prim);
		const indices = prim.getIndices()!; // Condition for 'included' list.
		if (
			includedAccessors.get(indices) !== hashKey ||
			prim.listAttributes().some((attr) => includedAccessors.get(attr) !== hashKey)
		) {
			throw new Error(`[${NAME}] Draco primitives must share all, or no, accessors.`);
		}
	}

	// For each excluded Primitive, ensure that no Accessors are compressed.
	for (const prim of Array.from(excluded)) {
		const indices = prim.getIndices()!; // Condition for 'included' list.
		if (includedAccessors.has(indices) || prim.listAttributes().some((attr) => includedAccessors.has(attr))) {
			throw new Error(`[${NAME}] Accessor cannot be shared by compressed and uncompressed primitives.`);
		}
	}

	return primToHashKey;
}

function createHashKey(prim: Primitive, indexMap: Map<Accessor, number>): string {
	const hashElements = [];
	const indices = prim.getIndices()!; // Condition for 'included' list.

	hashElements.push(indexMap.get(indices));
	for (const attribute of prim.listAttributes()) {
		hashElements.push(indexMap.get(attribute));
	}

	return hashElements.sort().join('|');
}
