import { GraphChild } from '../graph/index';
import { Vector3, Vector4 } from '../utils/math';
import { Element } from './element';
import { TextureLink } from './element-links';
import { Texture, TextureInfo } from './texture';

export class Material extends Element {
	private alphaMode: GLTF.MaterialAlphaMode = GLTF.MaterialAlphaMode.OPAQUE;
	private alphaCutoff = 0.5;
	private doubleSided = false;
	private baseColorFactor: Vector4 = new Vector4(1, 1, 1, 1);
	private emissiveFactor: Vector3 = new Vector3(0, 0, 0);
	private normalScale = 1;
	private occlusionStrength = 1;
	private roughnessFactor = 1;
	private metallicFactor = 1;

	@GraphChild private baseColorTexture: TextureLink = null;
	@GraphChild private emissiveTexture: TextureLink = null;
	@GraphChild private normalTexture: TextureLink = null;
	@GraphChild private occlusionTexture: TextureLink = null;
	@GraphChild private roughnessMetallicTexture: TextureLink = null;

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

	public getBaseColorFactor(): Vector4 { return this.baseColorFactor; }
	public getEmissiveFactor(): Vector3 { return this.emissiveFactor; }
	public getNormalScale(): number { return this. normalScale; }
	public getOcclusionStrength(): number { return this.occlusionStrength; }
	public getRoughnessFactor(): number { return this.roughnessFactor; }
	public getMetallicFactor(): number { return this.metallicFactor; }

	public setBaseColorFactor(baseColorFactor: Vector4): Material {
		this.baseColorFactor = baseColorFactor;
		return this;
	}
	public setEmissiveFactor(emissiveFactor: Vector3): Material {
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

	public getBaseColorTexture(): Texture { return this.baseColorTexture.getRight(); }
	public getBaseColorTextureInfo(): TextureInfo { return this.baseColorTexture.textureInfo; }
	public getEmissiveTexture(): Texture { return this.emissiveTexture.getRight(); }
	public getEmissiveTextureInfo(): TextureInfo { return this.emissiveTexture.textureInfo; }
	public getNormalTexture(): Texture { return this.normalTexture.getRight(); }
	public getNormalTextureInfo(): TextureInfo { return this.normalTexture.textureInfo; }
	public getOcclusionTexture(): Texture { return this.occlusionTexture.getRight(); }
	public getOcclusionTextureInfo(): TextureInfo { return this.occlusionTexture.textureInfo; }
	public getRoughnessMetallicTexture(): Texture { return this.roughnessMetallicTexture.getRight(); }
	public getRoughnessMetallicTextureInfo(): TextureInfo { return this.roughnessMetallicTexture.textureInfo; }

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
	public setRoughnessMetallicTexture(texture: Texture): Material {
		this.roughnessMetallicTexture = this.graph.linkTexture('roughnessMetallicTexture', this, texture);
		return this;
	}
}
