import { Extension, MathUtils, ReaderContext, WriterContext, vec2 } from '@gltf-transform/core';
import { KHR_TEXTURE_TRANSFORM } from '../constants';
import { Transform } from './transform';

const NAME = KHR_TEXTURE_TRANSFORM;

interface TransformDef {
	offset?: vec2;
	rotation?: number;
	scale?: vec2;
	texCoord?: number;
}

/** Documentation in {@link EXTENSIONS.md}. */
export class TextureTransform extends Extension {
	public readonly extensionName = NAME;
	public static readonly EXTENSION_NAME = NAME;

	public createTransform(): Transform {
		return new Transform(this.doc.getGraph(), this);
	}

	public read(context: ReaderContext): this {
		for (const [textureInfo, textureInfoDef] of Array.from(context.textureInfos.entries())) {
			if (!textureInfoDef.extensions || !textureInfoDef.extensions[NAME]) continue;

			const transform = this.createTransform();
			const transformDef = textureInfoDef.extensions[NAME] as TransformDef;

			if (transformDef.offset !== undefined) transform.setOffset(transformDef.offset);
			if (transformDef.rotation !== undefined) transform.setRotation(transformDef.rotation);
			if (transformDef.scale !== undefined) transform.setScale(transformDef.scale);
			if (transformDef.texCoord !== undefined) transform.setTexCoord(transformDef.texCoord);

			textureInfo.setExtension(NAME, transform);
		}
		return this;
	}

	public write(context: WriterContext): this {
		const textureInfoEntries = Array.from(context.textureInfoDefMap.entries());
		for (const [textureInfo, textureInfoDef] of textureInfoEntries) {
			const transform = textureInfo.getExtension<Transform>(NAME);
			if (!transform) continue;

			textureInfoDef.extensions = textureInfoDef.extensions || {};
			const transformDef = {} as TransformDef;

			const eq = MathUtils.eq;
			if (!eq(transform.getOffset(), [0, 0])) transformDef.offset = transform.getOffset();
			if (transform.getRotation() !== 0) transformDef.rotation = transform.getRotation();
			if (!eq(transform.getScale(), [1, 1])) transformDef.scale = transform.getScale();
			if (transform.getTexCoord() != null) transformDef.texCoord = transform.getTexCoord()!;

			textureInfoDef.extensions[NAME] = transformDef;
		}
		return this;
	}
}
