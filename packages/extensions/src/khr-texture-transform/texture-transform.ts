import { Extension, MathUtils, type ReaderContext, type vec2, type WriterContext } from '@gltf-transform/core';
import { KHR_TEXTURE_TRANSFORM } from '../constants.js';
import { Transform } from './transform.js';

interface TransformDef {
	offset?: vec2;
	rotation?: number;
	scale?: vec2;
	texCoord?: number;
}

/**
 * [`KHR_texture_transform`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_texture_transform/)
 * adds offset, rotation, and scale to {@link TextureInfo} properties.
 *
 * Affine UV transforms are useful for reducing the number of textures the GPU must load, improving
 * performance when used in techniques like texture atlases. UV transforms cannot be animated at
 * this time.
 *
 * Properties:
 * - {@link Transform}
 *
 * ### Example
 *
 * The `KHRTextureTransform` class provides a single {@link ExtensionProperty} type, `Transform`, which
 * may be attached to any {@link TextureInfo} instance. For example:
 *
 * ```typescript
 * import { KHRTextureTransform } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const transformExtension = document.createExtension(KHRTextureTransform)
 * 	.setRequired(true);
 *
 * // Create a reusable Transform.
 * const transform = transformExtension.createTransform()
 * 	.setScale([100, 100]);
 *
 * // Apply the Transform to a Material's baseColorTexture.
 * document.createMaterial()
 * 	.setBaseColorTexture(myTexture)
 * 	.getBaseColorTextureInfo()
 * 	.setExtension('KHR_texture_transform', transform);
 * ```
 */
export class KHRTextureTransform extends Extension {
	public readonly extensionName: typeof KHR_TEXTURE_TRANSFORM = KHR_TEXTURE_TRANSFORM;
	public static readonly EXTENSION_NAME: typeof KHR_TEXTURE_TRANSFORM = KHR_TEXTURE_TRANSFORM;

	/** Creates a new Transform property for use on a {@link TextureInfo}. */
	public createTransform(): Transform {
		return new Transform(this.document.getGraph());
	}

	/** @hidden */
	public read(context: ReaderContext): this {
		for (const [textureInfo, textureInfoDef] of Array.from(context.textureInfos.entries())) {
			if (!textureInfoDef.extensions || !textureInfoDef.extensions[KHR_TEXTURE_TRANSFORM]) continue;

			const transform = this.createTransform();
			const transformDef = textureInfoDef.extensions[KHR_TEXTURE_TRANSFORM] as TransformDef;

			if (transformDef.offset !== undefined) transform.setOffset(transformDef.offset);
			if (transformDef.rotation !== undefined) transform.setRotation(transformDef.rotation);
			if (transformDef.scale !== undefined) transform.setScale(transformDef.scale);
			if (transformDef.texCoord !== undefined) transform.setTexCoord(transformDef.texCoord);

			textureInfo.setExtension(KHR_TEXTURE_TRANSFORM, transform);
		}
		return this;
	}

	/** @hidden */
	public write(context: WriterContext): this {
		const textureInfoEntries = Array.from(context.textureInfoDefMap.entries());
		for (const [textureInfo, textureInfoDef] of textureInfoEntries) {
			const transform = textureInfo.getExtension<Transform>(KHR_TEXTURE_TRANSFORM);
			if (!transform) continue;

			textureInfoDef.extensions = textureInfoDef.extensions || {};
			const transformDef = {} as TransformDef;

			const eq = MathUtils.eq;
			if (!eq(transform.getOffset(), [0, 0])) transformDef.offset = transform.getOffset();
			if (transform.getRotation() !== 0) transformDef.rotation = transform.getRotation();
			if (!eq(transform.getScale(), [1, 1])) transformDef.scale = transform.getScale();
			if (transform.getTexCoord() != null) transformDef.texCoord = transform.getTexCoord()!;

			textureInfoDef.extensions[KHR_TEXTURE_TRANSFORM] = transformDef;
		}
		return this;
	}
}
