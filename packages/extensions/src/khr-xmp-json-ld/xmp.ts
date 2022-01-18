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
import { KHR_XMP_JSON_LD } from '../constants';
import { Packet } from './packet';

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

export class XMP extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createPacket(): Packet {
		return new Packet(this.document.getGraph());
	}

	public listPackets(): Packet[] {
		return Array.from(this.properties) as Packet[];
	}

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
			json.textures,
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

	public write(context: WriterContext): this {
		const { json } = context.jsonDoc;

		const packetDefs = [];

		for (const packet of this.properties as Set<Packet>) {
			// Serialize packets.
			packetDefs.push(packet.toJSONLD());

			// Assign packets.
			for (const parent of packet.listParents()) {
				let parentDef: XMPParentDef;

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
						parentDef = json.textures![context.imageIndexMap.get(parent as Texture)!];
						break;
					case PropertyType.ANIMATION:
						parentDef = json.animations![context.animationIndexMap.get(parent as Animation)!];
						break;
					default:
						this.document
							.getLogger()
							.warn(`[${NAME}]: Unsupported parent property, "${parent.propertyType}"`);
						continue;
				}

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
