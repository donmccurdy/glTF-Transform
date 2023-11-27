import {
  ExtensionProperty,
  IProperty,
  Nullable,
  PropertyType,
  Texture,
  TextureInfo,
  TextureChannel,
  vec3,
  ColorUtils,
} from "@gltf-transform/core";
import { VRM0 as VRM0NAME } from "./VRM0/constants.ts";
import { VRMC_MATERIALS_MTOON as VRM1NAME } from "./VRM1/constants.ts";

const { R, G, B } = TextureChannel;

/**
 * @see https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_materials_mtoon-1.0/README.md
 */
export interface IMaterialMToonProp extends IProperty {
  specVersion: string;

  transparentWithZWrite: boolean;
  renderQueueOffsetNumber: number;

  /**
   * Lighting
   */
  shadeColorFactor: vec3;
  shadeMultiplyTexture: Texture;
  shadeMultiplyTextureInfo: TextureInfo;
  shadingShiftFactor: number;
  shadingShiftTexture: Texture;
  shadingShiftTextureInfo: TextureInfo;
  shadingToonyFactor: number;
  giEqualizationFactor: number;

  /**
   * Rim
   */
  matcapFactor: vec3;
  matcapTexture: Texture;
  matcapTextureInfo: TextureInfo;
  parametricRimColorFactor: vec3;
  rimMultiplyTexture: Texture;
  rimMultiplyTextureInfo: TextureInfo;
  rimLightingMixFactor: number;
  parametricRimFresnelPowerFactor: number;
  parametricRimLiftFactor: number;

  /**
   * Outline
   */
  outlineWidthMode: string;
  outlineWidthFactor: number;
  outlineWidthMultiplyTexture: Texture;
  outlineWidthMultiplyTextureInfo: TextureInfo;
  outlineColorFactor: vec3;
  outlineLightingMixFactor: number;

  /**
   * UV Animation
   */
  uvAnimationMaskTexture: Texture;
  uvAnimationMaskTextureInfo: TextureInfo;
  uvAnimationScrollXSpeedFactor: number;
  uvAnimationScrollYSpeedFactor: number;
  uvAnimationRotationSpeedFactor: number;
}

export default class MaterialMToonProp extends ExtensionProperty<IMaterialMToonProp> {
  public declare extensionName: typeof VRM0NAME | typeof VRM1NAME;
  public declare propertyType: "VRMC_materialsMToon";
  public declare parentTypes: [PropertyType.MATERIAL];

  protected init(): void {
    this.extensionName = VRM1NAME;
    this.propertyType = "VRMC_materialsMToon";
    this.parentTypes = [PropertyType.MATERIAL];
  }

  protected getDefaults(): Nullable<IMaterialMToonProp> {
    return Object.assign(super.getDefaults() as IProperty, {
      specVersion: "1.0",

      transparentWithZWrite: false,
      renderQueueOffsetNumber: 0,

      /**
       * Lighting
       */
      shadeColorFactor: [0, 0, 0] as vec3,
      shadeMultiplyTexture: null,
      shadeMultiplyTextureInfo: new TextureInfo(
        this.graph,
        "shadeMultiplyTextureInfo"
      ),
      shadingShiftFactor: 0.0,
      shadingShiftTexture: null,
      shadingShiftTextureInfo: new TextureInfo(
        this.graph,
        "shadingShiftTextureInfo"
      ),
      shadingToonyFactor: 0.9,
      giEqualizationFactor: 0.9,

      /**
       * Rim
       */
      matcapFactor: [1, 1, 1] as vec3,
      matcapTexture: null,
      matcapTextureInfo: new TextureInfo(this.graph, "matcapTextureInfo"),
      parametricRimColorFactor: [0, 0, 0] as vec3,
      rimMultiplyTexture: null,
      rimMultiplyTextureInfo: new TextureInfo(
        this.graph,
        "rimMultiplyTextureInfo"
      ),
      rimLightingMixFactor: 1.0,
      parametricRimFresnelPowerFactor: 5.0,
      parametricRimLiftFactor: 0.0,

      /**
       * Outline
       */
      outlineWidthMode: "none",
      outlineWidthFactor: 0.0,
      outlineWidthMultiplyTexture: null,
      outlineWidthMultiplyTextureInfo: new TextureInfo(
        this.graph,
        "outlineWidthMultiplyTextureInfo"
      ),
      outlineColorFactor: [0, 0, 0] as vec3,
      outlineLightingMixFactor: 1.0,

      /**
       * UV Animation
       */
      uvAnimationMaskTexture: null,
      uvAnimationMaskTextureInfo: new TextureInfo(
        this.graph,
        "uvAnimationMaskTextureInfo"
      ),
      uvAnimationScrollXSpeedFactor: 0.0,
      uvAnimationScrollYSpeedFactor: 0.0,
      uvAnimationRotationSpeedFactor: 0.0,
    });
  }

  public getSpecVersion(): string {
    return this.get("specVersion");
  }
  public setSpecVersion(specVersion: string): this {
    return this.set("specVersion", specVersion);
  }

  public getTransparentWithZWrite(): boolean {
    return this.get("transparentWithZWrite");
  }
  public setTransparentWithZWrite(transparentWithZWrite: boolean): this {
    return this.set("transparentWithZWrite", transparentWithZWrite);
  }

  public getRenderQueueOffsetNumber(): number {
    return this.get("renderQueueOffsetNumber");
  }
  public setRenderQueueOffsetNumber(renderQueueOffsetNumber: number): this {
    return this.set("renderQueueOffsetNumber", renderQueueOffsetNumber);
  }

  /**********************************************************************************************
   * Lighting
   */
  public getShadeColorFactor(): vec3 {
    return this.get("shadeColorFactor");
  }
  public setShadeColorFactor(shadeColorFactor: vec3): this {
    return this.set("shadeColorFactor", shadeColorFactor);
  }
  public getShadeColorHex(): number {
    return ColorUtils.factorToHex(this.get("shadeColorFactor"));
  }
  public setShadeColorHex(hex: number): this {
    const factor = this.get("shadeColorFactor").slice() as vec3;
    return this.set("shadeColorFactor", ColorUtils.hexToFactor(hex, factor));
  }

  public getShadeMultiplyTexture(): Texture | null {
    return this.getRef("shadeMultiplyTexture");
  }
  public setShadeMultiplyTexture(texture: Texture | null): this {
    return this.setRef("shadeMultiplyTexture", texture, {
      channels: R | G | B,
    });
  }
  public getShadeMultiplyTextureInfo(): TextureInfo | null {
    return this.getRef("shadeMultiplyTexture")
      ? this.getRef("shadeMultiplyTextureInfo")
      : null;
  }

  public getShadingShiftFactor(): number {
    return this.get("shadingShiftFactor");
  }
  public setShadingShiftFactor(shadingShiftFactor: number): this {
    return this.set("shadingShiftFactor", shadingShiftFactor);
  }

  public getShadingShiftTexture(): Texture | null {
    return this.getRef("shadingShiftTexture");
  }
  public setShadingShiftTexture(texture: Texture | null): this {
    return this.setRef("shadingShiftTexture", texture, {
      channels: R | G | B,
    });
  }
  public getShadingShiftTextureInfo(): TextureInfo | null {
    return this.getRef("shadingShiftTexture")
      ? this.getRef("shadingShiftTextureInfo")
      : null;
  }

  public getShadingToonyFactor(): number {
    return this.get("shadingToonyFactor");
  }
  public setShadingToonyFactor(shadingToonyFactor: number): this {
    return this.set("shadingToonyFactor", shadingToonyFactor);
  }

  public getGIEqualizationFactor(): number {
    return this.get("giEqualizationFactor");
  }
  public setGIEqualizationFactor(giEqualizationFactor: number): this {
    return this.set("giEqualizationFactor", giEqualizationFactor);
  }

  /**********************************************************************************************
   * Rim
   */
  public getMatcapFactor(): vec3 {
    return this.get("matcapFactor");
  }
  public setMatcapFactor(matcapFactor: vec3): this {
    return this.set("matcapFactor", matcapFactor);
  }
  public getMatcapHex(): number {
    return ColorUtils.factorToHex(this.get("matcapFactor"));
  }
  public setMatcapHex(hex: number): this {
    const factor = this.get("matcapFactor").slice() as vec3;
    return this.set("matcapFactor", ColorUtils.hexToFactor(hex, factor));
  }

  public getMatcapTexture(): Texture | null {
    return this.getRef("matcapTexture");
  }
  public setMatcapTexture(texture: Texture | null): this {
    return this.setRef("matcapTexture", texture, {
      channels: R | G | B,
    });
  }
  public getMatcapTextureInfo(): TextureInfo | null {
    return this.getRef("matcapTexture")
      ? this.getRef("matcapTextureInfo")
      : null;
  }

  public getParametricRimColorFactor(): vec3 {
    return this.get("parametricRimColorFactor");
  }
  public setParametricRimColorFactor(parametricRimColorFactor: vec3): this {
    return this.set("parametricRimColorFactor", parametricRimColorFactor);
  }
  public getParametricRimColorHex(): number {
    return ColorUtils.factorToHex(this.get("parametricRimColorFactor"));
  }
  public setParametricRimColorHex(hex: number): this {
    const factor = this.get("parametricRimColorFactor").slice() as vec3;
    return this.set(
      "parametricRimColorFactor",
      ColorUtils.hexToFactor(hex, factor)
    );
  }

  public getRimMultiplyTexture(): Texture | null {
    return this.getRef("rimMultiplyTexture");
  }
  public setRimMultiplyTexture(texture: Texture | null): this {
    return this.setRef("rimMultiplyTexture", texture, {
      channels: R | G | B,
    });
  }
  public getRimMultiplyTextureInfo(): TextureInfo | null {
    return this.getRef("rimMultiplyTexture")
      ? this.getRef("rimMultiplyTextureInfo")
      : null;
  }

  public getRimLightningMixFactor(): number {
    return this.get("rimLightingMixFactor");
  }
  public setRimLightningMixFactor(rimLightningMixFactor: number): this {
    return this.set("rimLightingMixFactor", rimLightningMixFactor);
  }

  public getParametricRimFresnelPowerFactor(): number {
    return this.get("parametricRimFresnelPowerFactor");
  }
  public setParametricRimFresnelPowerFactor(
    parametricRimFresnelPowerFactor: number
  ): this {
    return this.set(
      "parametricRimFresnelPowerFactor",
      parametricRimFresnelPowerFactor
    );
  }

  public getParametricRimLiftFactor(): number {
    return this.get("parametricRimLiftFactor");
  }
  public setParametricRimLiftFactor(parametricRimLiftFactor: number): this {
    return this.set("parametricRimLiftFactor", parametricRimLiftFactor);
  }

  /**********************************************************************************************
   * Outline
   */
  public getOutlineWidthMode(): string {
    return this.get("outlineWidthMode");
  }
  public setOutlineWidthMode(outlineWidthMode: string) {
    return this.set("outlineWidthMode", outlineWidthMode);
  }

  public getOutlineWidthFactor(): number {
    return this.get("outlineWidthFactor");
  }
  public setOutlineWidthFactor(outlineWidthFactor: number): this {
    return this.set("outlineWidthFactor", outlineWidthFactor);
  }

  public getOutlineWidthMultiplyTexture(): Texture | null {
    return this.getRef("outlineWidthMultiplyTexture");
  }
  public setOutlineWidthMultiplyTexture(texture: Texture | null): this {
    return this.setRef("outlineWidthMultiplyTexture", texture, {
      channels: R | G | B,
    });
  }
  public getOutlineWidthMultiplyTextureInfo(): TextureInfo | null {
    return this.getRef("outlineWidthMultiplyTexture")
      ? this.getRef("outlineWidthMultiplyTextureInfo")
      : null;
  }

  public getOutlineColorFactor(): vec3 {
    return this.get("outlineColorFactor");
  }
  public setOutlineColorFactor(outlineColorFactor: vec3): this {
    return this.set("outlineColorFactor", outlineColorFactor);
  }
  public getOutlineColorHex(): number {
    return ColorUtils.factorToHex(this.get("outlineColorFactor"));
  }
  public setOutlineColorHex(hex: number): this {
    const factor = this.get("outlineColorFactor").slice() as vec3;
    return this.set("outlineColorFactor", ColorUtils.hexToFactor(hex, factor));
  }

  public getOutlineLightningMixFactor(): number {
    return this.get("outlineLightingMixFactor");
  }
  public setOutlineLightningMixFactor(outlineLightningMixFactor: number): this {
    return this.set("outlineLightingMixFactor", outlineLightningMixFactor);
  }

  /**********************************************************************************************
   * UV Animation
   */
  public getUVAnimationMaskTexture(): Texture | null {
    return this.getRef("uvAnimationMaskTexture");
  }
  public setUVAnimationMaskTexture(texture: Texture | null): this {
    return this.setRef("uvAnimationMaskTexture", texture, {
      channels: R | G | B,
    });
  }
  public getUVAnimationMaskTextureInfo(): TextureInfo | null {
    return this.getRef("uvAnimationMaskTexture")
      ? this.getRef("uvAnimationMaskTextureInfo")
      : null;
  }

  public getUVAnimationScrollXSpeedFactor(): number {
    return this.get("uvAnimationScrollXSpeedFactor");
  }
  public setUVAnimationScrollXSpeedFactor(
    uvAnimationScrollXSpeedFactor: number
  ): this {
    return this.set(
      "uvAnimationScrollXSpeedFactor",
      uvAnimationScrollXSpeedFactor
    );
  }

  public getUVAnimationScrollYSpeedFactor(): number {
    return this.get("uvAnimationScrollYSpeedFactor");
  }
  public setUVAnimationScrollYSpeedFactor(
    uvAnimationScrollYSpeedFactor: number
  ): this {
    return this.set(
      "uvAnimationScrollYSpeedFactor",
      uvAnimationScrollYSpeedFactor
    );
  }

  public getUVAnimationRotationSpeedFactor(): number {
    return this.get("uvAnimationRotationSpeedFactor");
  }
  public setUVAnimationSRotationpeedFactor(
    uvAnimationRotationSpeedFactor: number
  ): this {
    return this.set(
      "uvAnimationRotationSpeedFactor",
      uvAnimationRotationSpeedFactor
    );
  }
}
