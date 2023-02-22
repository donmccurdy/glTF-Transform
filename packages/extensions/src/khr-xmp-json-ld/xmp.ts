import {
	Animation,
	Extension,
	GLTF,
	Material,
	Mesh,
	Node,
	PropertyType,
	ReaderContext,
	Scene,
	Texture,
	WriterContext,
} from '@gltf-transform/core';
import { KHR_XMP_JSON_LD } from '../constants.js';
import { Packet } from './packet.js';

const NAME = KHR_XMP_JSON_LD;

type XMPPacketDef = Record<string, unknown>;

type XMPParentDef =
	| GLTF.IAsset
	| GLTF.IScene
	| GLTF.INode
	| GLTF.IMesh
	| GLTF.IMaterial
	| GLTF.ITexture
	| GLTF.IAnimation;

interface XMPPropertyDef {
	packet: number;
}

interface XMPRootDef {
	packets?: XMPPacketDef[];
}

/**
 * # KHRXMP
 *
 * [KHR_xmp_json_ld](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_xmp_json_ld/)
 * defines XMP metadata associated with a glTF asset.
 *
 * XMP metadata provides standardized fields describing the content, provenance, usage
 * restrictions, or other attributes of a 3D model. XMP metadata does not generally affect the
 * parsing or runtime behavior of the content — for that, use custom extensions, custom vertex
 * attributes, or extras. Similarly, storage mechanisms other than XMP should be preferred
 * for binary content like mesh data, animations, or textures.
 *
 * Generally XMP metadata is associated with the entire glTF asset by attaching an XMP {@link Packet}
 * to the document {@link Root}. In less common cases where metadata must be associated with
 * specific subsets of a document, XMP Packets may be attached to {@link Scene}, {@link Node},
 * {@link Mesh}, {@link Material}, {@link Texture}, or {@link Animation} properties.
 *
 * Within each packet, XMP properties become available when an
 * [XMP namespace](https://www.adobe.io/xmp/docs/XMPNamespaces/) is registered
 * with {@link Packet.setContext}. Packets cannot use properties whose namespaces are not
 * registered as context. While not all XMP namespaces are relevant to 3D assets, some common
 * namespaces provide useful metadata about authorship and provenance. Additionally, the `model3d`
 * namespace provides certain properties specific to 3D content, such as Augmented Reality (AR)
 * orientation data.
 *
 * Common XMP contexts for 3D models include:
 *
 * | Prefix      | URI                                         | Name                           |
 * |:------------|:--------------------------------------------|:-------------------------------|
 * | `dc`        | http://purl.org/dc/elements/1.1/            | Dublin Core                    |
 * | `model3d`   | https://schema.khronos.org/model3d/xsd/1.0/ | Model 3D                       |
 * | `rdf`       | http://www.w3.org/1999/02/22-rdf-syntax-ns# | Resource Description Framework |
 * | `xmp`       | http://ns.adobe.com/xap/1.0/                | XMP                            |
 * | `xmpRights` | http://ns.adobe.com/xap/1.0/rights/         | XMP Rights Management          |
 *
 * Only the XMP contexts required for a packet should be assigned, and different packets
 * in the same asset may use different contexts. For greater detail on available XMP
 * contexts and how to use them in glTF assets, see the
 * [3DC Metadata Recommendations](https://github.com/KhronosGroup/3DC-Metadata-Recommendations/blob/main/model3d.md).
 *
 * Properties:
 * - {@link Packet}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRXMP, Packet } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const xmpExtension = document.createExtension(KHRXMP);
 *
 * // Create Packet property.
 * const packet = xmpExtension.createPacket()
 * 	.setContext({
 * 		dc: 'http://purl.org/dc/elements/1.1/',
 * 	})
 *	.setProperty('dc:Creator', {"@list": ["Acme, Inc."]});
 *
 * // Option 1: Assign to Document Root.
 * document.getRoot().setExtension('KHR_xmp_json_ld', packet);
 *
 * // Option 2: Assign to a specific Property.
 * texture.setExtension('KHR_xmp_json_ld', packet);
 * ```
 */
export class KHRXMP extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	/** Creates a new XMP packet, to be linked with a {@link Document} or {@link Property Properties}. */
	public createPacket(): Packet {
		return new Packet(this.document.getGraph());
	}

	/** Lists XMP packets currently defined in a {@link Document}. */
	public listPackets(): Packet[] {
		return Array.from(this.properties) as Packet[];
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		const extensionDef = context.jsonDoc.json.extensions?.[NAME] as XMPRootDef | undefined;
		if (!extensionDef || !extensionDef.packets) return this;

		// Deserialize packets.
		const json = context.jsonDoc.json;
		const root = this.document.getRoot();
		const packets = extensionDef.packets.map((packetDef) => this.createPacket().fromJSONLD(packetDef));

		const defLists = [
			[json.asset],
			json.scenes,
			json.nodes,
			json.meshes,
			json.materials,
			json.images,
			json.animations,
		];

		const propertyLists = [
			[root],
			root.listScenes(),
			root.listNodes(),
			root.listMeshes(),
			root.listMaterials(),
			root.listTextures(),
			root.listAnimations(),
		];

		// Assign packets.
		for (let i = 0; i < defLists.length; i++) {
			const defs = defLists[i] || [];
			for (let j = 0; j < defs.length; j++) {
				const def = defs[j];
				if (def.extensions && def.extensions[NAME]) {
					const xmpDef = def.extensions[NAME] as XMPPropertyDef;
					propertyLists[i][j].setExtension(NAME, packets[xmpDef.packet]);
				}
			}
		}

		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const { json } = context.jsonDoc;

		const packetDefs = [];

		for (const packet of this.properties as Set<Packet>) {
			// Serialize packets.
			packetDefs.push(packet.toJSONLD());

			// Assign packets.

			for (const parent of packet.listParents()) {
				let parentDef: XMPParentDef | null;

				switch (parent.propertyType) {
					case PropertyType.ROOT:
						parentDef = json.asset;
						break;
					case PropertyType.SCENE:
						parentDef = json.scenes![context.sceneIndexMap.get(parent as Scene)!];
						break;
					case PropertyType.NODE:
						parentDef = json.nodes![context.nodeIndexMap.get(parent as Node)!];
						break;
					case PropertyType.MESH:
						parentDef = json.meshes![context.meshIndexMap.get(parent as Mesh)!];
						break;
					case PropertyType.MATERIAL:
						parentDef = json.materials![context.materialIndexMap.get(parent as Material)!];
						break;
					case PropertyType.TEXTURE:
						parentDef = json.images![context.imageIndexMap.get(parent as Texture)!];
						break;
					case PropertyType.ANIMATION:
						parentDef = json.animations![context.animationIndexMap.get(parent as Animation)!];
						break;
					default:
						parentDef = null;
						this.document
							.getLogger()
							.warn(`[${NAME}]: Unsupported parent property, "${parent.propertyType}"`);
						break;
				}

				if (!parentDef) continue;

				parentDef.extensions = parentDef.extensions || {};
				parentDef.extensions[NAME] = { packet: packetDefs.length - 1 };
			}
		}

		if (packetDefs.length > 0) {
			json.extensions = json.extensions || {};
			json.extensions[NAME] = { packets: packetDefs };
		}

		return this;
	}
}
