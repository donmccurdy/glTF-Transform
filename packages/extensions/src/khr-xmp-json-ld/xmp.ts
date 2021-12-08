import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_XMP_JSON_LD } from '../constants';
import { Packet } from './packet';

export class XMP extends Extension {
	public readonly extensionName = KHR_XMP_JSON_LD;
	public static readonly EXTENSION_NAME = KHR_XMP_JSON_LD;

	public createPacket(): Packet {
		return new Packet(this.doc.getGraph(), this);
	}

	public listPackets(): Packet[] {
		return Array.from(this.properties) as Packet[];
	}

	public read(context: ReaderContext): this {
		throw new Error('Not implemented.');
	}

	public write(context: WriterContext): this {
		throw new Error('Not implemented.');
	}
}
