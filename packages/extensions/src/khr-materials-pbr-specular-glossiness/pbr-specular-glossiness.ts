import {
	ColorUtils,
	ExtensionProperty,
	IProperty,
	Nullable,
	PropertyType,
	Texture,
	TextureChannel,
	TextureInfo,
	vec3,
	vec4,
} from '@gltf-transform/core';
import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from '../constants.js';

interface IPBRSpecularGlossiness extends IProperty {
	diffuseFactor: vec4;
	diffuseTexture: Texture;
	diffuseTextureInfo: TextureInfo;
	specularFactor: vec3;
	glossinessFactor: number;
	specularGlossinessTexture: Texture;
	specularGlossinessTextureInfo: TextureInfo;
}

const { R, G, B, A } = TextureChannel;

/**
 * # PBRSpecularGlossiness
 *
 * Converts a {@link Material} to a spec/gloss workflow. See {@link KHRMaterialsPBRSpecularGlossiness}.
 */
export class PBRSpecularGlossiness extends ExtensionProperty<IPBRSpecularGlossiness> {
	public static EXTENSION_NAME = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
	public declare extensionName: typeof KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
	public declare propertyType: 'PBRSpecularGlossiness';
	public declare parentTypes: [PropertyType.MATERIAL];

	protected init(): void {
		this.extensionName = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
		this.propertyType = 'PBRSpecularGlossiness';
		this.parentTypes = [PropertyType.MATERIAL];
	}

	protected getDefaults(): Nullable<IPBRSpecularGlossiness> {
		return Object.assign(super.getDefaults() as IProperty, {
			diffuseFactor: [1.0, 1.0, 1.0, 1.0] as vec4,
			diffuseTexture: null,
			diffuseTextureInfo: new TextureInfo(this.graph, 'diffuseTextureInfo'),
			specularFactor: [1.0, 1.0, 1.0] as vec3,
			glossinessFactor: 1.0,
			specularGlossinessTexture: null,
			specularGlossinessTextureInfo: new TextureInfo(this.graph, 'specularGlossinessTextureInfo'),
		});
	}

	/**********************************************************************************************
	 * Diffuse.
	 */

	/** Diffuse; Linear-sRGB components. See {@link getDiffuseTexture}. */
	public getDiffuseFactor(): vec4 {
		return this.get('diffuseFactor');
	}

	/** Diffuse; Linear-sRGB components. See {@link getDiffuseTexture}. */
	public setDiffuseFactor(factor: vec4): this {
		return this.set('diffuseFactor', factor);
	}

	/** Diffuse; sRGB hexadecimal color. */
	public getDiffuseHex(): number {
		return ColorUtils.factorToHex(this.getDiffuseFactor());
	}

	/** Diffuse; sRGB hexadecimal color. */
	public setDiffuseHex(hex: number): this {
		const factor = this.getDiffuseFactor().slice() as vec4;
		return this.setDiffuseFactor(ColorUtils.hexToFactor(hex, factor));
	}

	/**
	 * Diffuse texture; sRGB. Alternative to baseColorTexture, used within the
	 * spec/gloss PBR workflow.
	 */
	public getDiffuseTexture(): Texture | null {
		return this.getRef('diffuseTexture');
	}

	/**
	 * Settings affecting the material's use of its diffuse texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getDiffuseTextureInfo(): TextureInfo | null {
		return this.getRef('diffuseTexture') ? this.getRef('diffuseTextureInfo') : null;
	}

	/** Sets diffuse texture. See {@link getDiffuseTexture}. */
	public setDiffuseTexture(texture: Texture | null): this {
		return this.setRef('diffuseTexture', texture, { channels: R | G | B | A });
	}

	/**********************************************************************************************
	 * Specular.
	 */

	/** Specular; linear multiplier. */
	public getSpecularFactor(): vec3 {
		return this.get('specularFactor');
	}

	/** Specular; linear multiplier. */
	public setSpecularFactor(factor: vec3): this {
		return this.set('specularFactor', factor);
	}

	/**********************************************************************************************
	 * Glossiness.
	 */

	/** Glossiness; linear multiplier. */
	public getGlossinessFactor(): number {
		return this.get('glossinessFactor');
	}

	/** Glossiness; linear multiplier. */
	public setGlossinessFactor(factor: number): this {
		return this.set('glossinessFactor', factor);
	}

	/**********************************************************************************************
	 * Specular/Glossiness.
	 */

	/** Spec/gloss texture; linear multiplier. */
	public getSpecularGlossinessTexture(): Texture | null {
		return this.getRef('specularGlossinessTexture');
	}

	/**
	 * Settings affecting the material's use of its spec/gloss texture. If no texture is attached,
	 * {@link TextureInfo} is `null`.
	 */
	public getSpecularGlossinessTextureInfo(): TextureInfo | null {
		return this.getRef('specularGlossinessTexture') ? this.getRef('specularGlossinessTextureInfo') : null;
	}

	/** Spec/gloss texture; linear multiplier. */
	public setSpecularGlossinessTexture(texture: Texture | null): this {
		return this.setRef('specularGlossinessTexture', texture, { channels: R | G | B | A });
	}
}
