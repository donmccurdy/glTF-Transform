import { Texture, TextureInfo } from "./texture";
import { Vector3, Vector4 } from "../math";

import { Element } from "./element";
import { GraphChild } from "../graph/graph-decorators";
import { TextureLink } from "../graph/graph-links";

export class Material extends Element {
    private alphaMode: GLTF.MaterialAlphaMode = GLTF.MaterialAlphaMode.OPAQUE;
    private alphaCutoff: number;
    private doubleSided: boolean;
    private baseColorFactor: Vector4 = new Vector4(1, 1, 1, 1);
    private emissiveFactor: Vector3 = new Vector3(0, 0, 0);

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

    public setBaseColorFactor(baseColorFactor: Vector4): Material {
        this.baseColorFactor = baseColorFactor;
        return this;
    }
    public setEmissiveFactor(emissiveFactor: Vector3): Material {
        this.emissiveFactor = emissiveFactor;
        return this;
    }

    public getBaseColorTexture(): Texture { return this.baseColorTexture.getRight(); }
    public getBaseColorTextureInfo(): TextureInfo { return this.baseColorTexture.textureInfo; }
    public getEmissiveTexture(): Texture { return this.emissiveTexture.getRight(); }
    public getEmissiveTextureInfo(): TextureInfo { return this.emissiveTexture.textureInfo; }

    public setBaseColorTexture(texture: Texture): Material {
        this.baseColorTexture = this.graph.linkTexture(this, texture);
        return this;
    }
    public setEmissiveTexture(texture: Texture): Material {
        this.emissiveTexture = this.graph.linkTexture(this, texture);
        return this;
    }
}
