import { TextureInfo, vec2 } from '@gltf-transform/core';
import {
	ClampToEdgeWrapping,
	ColorSpace,
	LinearFilter,
	LinearMipmapLinearFilter,
	LinearMipmapNearestFilter,
	MagnificationTextureFilter,
	MinificationTextureFilter,
	MirroredRepeatWrapping,
	NearestFilter,
	NearestMipmapLinearFilter,
	NearestMipmapNearestFilter,
	RepeatWrapping,
	Texture,
	TextureFilter,
	Wrapping,
} from 'three';
import type { Transform } from '@gltf-transform/extensions';
import { Pool } from './Pool.js';

const WEBGL_FILTERS: Record<number, TextureFilter> = {
	9728: NearestFilter,
	9729: LinearFilter,
	9984: NearestMipmapNearestFilter,
	9985: LinearMipmapNearestFilter,
	9986: NearestMipmapLinearFilter,
	9987: LinearMipmapLinearFilter,
};

const WEBGL_WRAPPINGS: Record<number, Wrapping> = {
	33071: ClampToEdgeWrapping,
	33648: MirroredRepeatWrapping,
	10497: RepeatWrapping,
};

export interface TextureParams {
	colorSpace: ColorSpace;
	channel: number;
	minFilter: TextureFilter;
	magFilter: TextureFilter;
	wrapS: Wrapping;
	wrapT: Wrapping;
	offset: vec2;
	rotation: number;
	repeat: vec2;
}

const _VEC2 = { ZERO: [0, 0] as vec2, ONE: [1, 1] as vec2 };

/** @internal */
export class TexturePool extends Pool<Texture, TextureParams> {
	static createParams(textureInfo: TextureInfo, colorSpace: ColorSpace): TextureParams {
		const transform = textureInfo.getExtension<Transform>('KHR_texture_transform');
		return {
			colorSpace: colorSpace,
			channel: textureInfo.getTexCoord(),
			minFilter: WEBGL_FILTERS[textureInfo.getMinFilter() as number] || LinearMipmapLinearFilter,
			magFilter: WEBGL_FILTERS[textureInfo.getMagFilter() as number] || LinearFilter,
			wrapS: WEBGL_WRAPPINGS[textureInfo.getWrapS()] || RepeatWrapping,
			wrapT: WEBGL_WRAPPINGS[textureInfo.getWrapT()] || RepeatWrapping,
			offset: transform?.getOffset() || _VEC2.ZERO,
			rotation: transform?.getRotation() || 0,
			repeat: transform?.getScale() || _VEC2.ONE,
		};
	}

	requestVariant(base: Texture, params: TextureParams): Texture {
		return this._request(this._createVariant(base, params));
	}

	protected _disposeValue(value: Texture): void {
		value.dispose();
		super._disposeValue(value);
	}

	protected _createVariant(srcTexture: Texture, params: TextureParams): Texture {
		return this._updateVariant(srcTexture, srcTexture.clone(), params);
	}

	protected _updateVariant(srcTexture: Texture, dstTexture: Texture, params: TextureParams): Texture {
		const needsUpdate =
			srcTexture.image !== dstTexture.image ||
			dstTexture.colorSpace !== params.colorSpace ||
			dstTexture.wrapS !== params.wrapS ||
			dstTexture.wrapT !== params.wrapT;

		dstTexture.copy(srcTexture);
		dstTexture.colorSpace = params.colorSpace;
		dstTexture.channel = params.channel;
		dstTexture.minFilter = params.minFilter as MinificationTextureFilter;
		dstTexture.magFilter = params.magFilter as MagnificationTextureFilter;
		dstTexture.wrapS = params.wrapS;
		dstTexture.wrapT = params.wrapT;
		dstTexture.offset.fromArray(params.offset || _VEC2.ZERO);
		dstTexture.rotation = params.rotation || 0;
		dstTexture.repeat.fromArray(params.repeat || _VEC2.ONE);

		if (needsUpdate) {
			dstTexture.needsUpdate = true;
		}

		return dstTexture;
	}
}
