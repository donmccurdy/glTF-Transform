import { Extension, ReaderContext, WriterContext } from '@gltf-transform/core';
import { KHR_ACCESSOR_FLOAT64 } from '../constants.js';

const NAME = KHR_ACCESSOR_FLOAT64;

/**
 * TODO
 */
export class KHRAccessorFloat64 extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	/** @hidden */
	read(_: ReaderContext): this {
		return this;
	}

	/** @hidden */
	write(_: WriterContext): this {
		return this;
	}
}
