import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_TEXTURE_TRANSFORM } from '../constants';
import { Transform } from './transform';

const NAME = KHR_TEXTURE_TRANSFORM;

/** Documentation in {@link EXTENSIONS.md}. */
export class TextureTransform extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createTransform(): Transform {
		return new Transform(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		throw new Error('Not implemented.');
	}

	public write(context: WriterContext): this {
		throw new Error('Not implemented.');
	}
}
