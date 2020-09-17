import { Extension, GLB_BUFFER, PropertyType, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_DRACO_MESH_COMPRESSION } from '../constants';
import { decodeAttribute, decodeGeometry, decodeIndex, decoderModule } from './decoder';

const NAME = KHR_DRACO_MESH_COMPRESSION;

interface DracoPrimitiveExtension {
	bufferView: number;
	attributes: {
		[name: string]: number;
	};
}

/** Documentation in {@link EXTENSIONS.md}. */
export class DRACOMeshCompression extends Extension {
	public readonly extensionName = NAME;
	public readonly provideTypes = [PropertyType.PRIMITIVE];
	public static readonly EXTENSION_NAME = NAME;

	public provide(context: ReaderContext): this {
		const logger = this.doc.getLogger();
		const jsonDoc = context.jsonDoc;
		const decoder = new decoderModule.Decoder();
		const dracoMeshes: Map<number, DRACO.Mesh> = new Map();

		// Reference: https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/DRACOLoader.js
		for (const meshDef of jsonDoc.json.meshes) {
			for (const primDef of meshDef.primitives) {
				if (primDef.extensions && primDef.extensions[NAME]) {
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
						const accessorDef = context.jsonDoc.json.accessors[primDef.attributes[semantic]];
						const dracoAttribute = decoder.GetAttributeByUniqueId(dracoMesh, dracoDef.attributes[semantic]);
						const attributeArray = decodeAttribute(decoder, dracoMesh, dracoAttribute, accessorDef);
						context.accessors[primDef.attributes[semantic]].setArray(attributeArray);
					}

					// Indices.
					const indicesArray = decodeIndex(decoder, dracoMesh);
					context.accessors[primDef.indices].setArray(indicesArray);
				}
			}

			decoderModule.destroy(decoder);
			for (const dracoMesh of Array.from(dracoMeshes.values())) {
				decoderModule.destroy(dracoMesh);
			}
		}

		return this;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public read(context: ReaderContext): this {
		return this;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public write(context: WriterContext): this {
		throw new Error('Not implemented.');
	}
}
