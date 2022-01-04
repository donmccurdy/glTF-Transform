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

		const packets = extensionDef.packets.map((packetDef) => this.createPacket().fromJSONLD(packetDef));

		const assetDef = context.jsonDoc.json.asset;
		if (assetDef.extensions && assetDef.extensions[NAME]) {
			const def = assetDef.extensions[NAME] as XMPPropertyDef;
			this.document.getRoot().setExtension(NAME, packets[def.packet]);
		}

		// TODO(impl): Support non-root attachments.

		return this;
	}

	public write(context: WriterContext): this {
		const { json } = context.jsonDoc;

		const packetDefs = [];

		for (const packet of this.properties as Set<Packet>) {
			packetDefs.push(packet.toJSONLD());

			for (const parent of packet.listParents()) {
				let parentDef:
					| GLTF.IGLTF
					| GLTF.IScene
					| GLTF.INode
					| GLTF.IMesh
					| GLTF.IMaterial
					| GLTF.ITexture
					| GLTF.IAnimation;

				switch (parent.propertyType) {
					case PropertyType.ROOT:
						parentDef = json;
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
