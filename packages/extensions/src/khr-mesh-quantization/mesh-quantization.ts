import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_MESH_QUANTIZATION } from '../constants';

const NAME = KHR_MESH_QUANTIZATION;

export class MeshQuantization extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	read(_: ReaderContext): this {
		return this;
	}

	write(_: WriterContext): this {
		return this;
	}
}
