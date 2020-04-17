import { vec3, vec4 } from '../constants';
import { GraphChild } from '../graph/index';
import { Element } from './element';
import { TextureLink } from './element-links';
import { Texture, TextureInfo } from './texture';

/**
 * @category Elements
 */
export class Material extends Element {
	private alphaMode: GLTF.MaterialAlphaMode = GLTF.MaterialAlphaMode.OPAQUE;
	private alphaCutoff = 0.5;
	private doubleSided = false;
	private baseColorFactor: vec4 = [1, 1, 1, 1];
	private emissiveFactor: vec3 = [0, 0, 0];
	private normalScale = 1;
	private occlusionStrength = 1;
	private roughnessFactor = 1;
	private metallicFactor = 1;

	@GraphChild private baseColorTexture: TextureLink = null;
	@GraphChild private emissiveTexture: TextureLink = null;
	@GraphChild private normalTexture: TextureLink = null;
	@GraphChild private occlusionTexture: TextureLink = null;
	@GraphChild private metallicRoughnessTexture: TextureLink = null;

	public getAlphaMode(): GLTF.MaterialAlphaMode { return this.alphaMode; }
	public getAlphaCutoff(): number { return this.alphaCutoff; }
	public getDoubleSided(): boolean { return this.doubleSided; }

	public setAlphaMode(alphaMode: GLTF.MaterialAlphaMode): Material {
		this.alphaMode = alphaMode;
		return this;
	}
	public setAlphaCutoff(alphaCutoff: number): Material {
		this.alphaCutoff = alphaCutoff;
		return this;
	}
	public setDoubleSided(doubleSided: boolean): Material {
		this.doubleSided = doubleSided;
		return this;
	}

	public getBaseColorFactor(): vec4 { return this.baseColorFactor; }
	public getEmissiveFactor(): vec3 { return this.emissiveFactor; }
	public getNormalScale(): number { return this. normalScale; }
	public getOcclusionStrength(): number { return this.occlusionStrength; }
	public getRoughnessFactor(): number { return this.roughnessFactor; }
	public getMetallicFactor(): number { return this.metallicFactor; }

	public setBaseColorFactor(baseColorFactor: vec4): Material {
		this.baseColorFactor = baseColorFactor;
		return this;
	}
	public setEmissiveFactor(emissiveFactor: vec3): Material {
		this.emissiveFactor = emissiveFactor;
		return this;
	}
	public setNormalScale(normalScale: number): Material {
		this.normalScale = normalScale;
		return this;
	}
	public setOcclusionStrength(occlusionStrength: number): Material {
		this.occlusionStrength = occlusionStrength;
		return this;
	}
	public setRoughnessFactor(roughnessFactor: number): Material {
		this.roughnessFactor = roughnessFactor;
		return this;
	}
	public setMetallicFactor(metallicFactor: number): Material {
		this.metallicFactor = metallicFactor;
		return this;
	}

	public getBaseColorTexture(): Texture {
		return this.baseColorTexture ? this.baseColorTexture.getRight() : null;
	}
	public getEmissiveTexture(): Texture {
		return this.emissiveTexture ? this.emissiveTexture.getRight() : null;
	}
	public getNormalTexture(): Texture {
		return this.normalTexture ? this.normalTexture.getRight() : null;
	}
	public getOcclusionTexture(): Texture {
		return this.occlusionTexture ? this.occlusionTexture.getRight() : null;
	}
	public getMetallicRoughnessTexture(): Texture {
		return this.metallicRoughnessTexture ? this.metallicRoughnessTexture.getRight() : null;
	}

	public getBaseColorTextureInfo(): TextureInfo { return this.baseColorTexture.textureInfo; }
	public getEmissiveTextureInfo(): TextureInfo { return this.emissiveTexture.textureInfo; }
	public getNormalTextureInfo(): TextureInfo { return this.normalTexture.textureInfo; }
	public getOcclusionTextureInfo(): TextureInfo { return this.occlusionTexture.textureInfo; }
	public getMetallicRoughnessTextureInfo(): TextureInfo { return this.metallicRoughnessTexture.textureInfo; }

	public setBaseColorTexture(texture: Texture): Material {
		this.baseColorTexture = this.graph.linkTexture('baseColorTexture', this, texture);
		return this;
	}
	public setEmissiveTexture(texture: Texture): Material {
		this.emissiveTexture = this.graph.linkTexture('emissiveTexture', this, texture);
		return this;
	}
	public setNormalTexture(texture: Texture): Material {
		this.normalTexture = this.graph.linkTexture('normalTexture', this, texture);
		return this;
	}
	public setOcclusionTexture(texture: Texture): Material {
		this.occlusionTexture = this.graph.linkTexture('occlusionTexture', this, texture);
		return this;
	}
	public setMetallicRoughnessTexture(texture: Texture): Material {
		this.metallicRoughnessTexture = this.graph.linkTexture('metallicRoughnessTexture', this, texture);
		return this;
	}
}
