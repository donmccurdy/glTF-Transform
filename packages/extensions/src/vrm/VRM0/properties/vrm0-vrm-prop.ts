import {
  ExtensionProperty,
  IProperty,
  Nullable,
  PropertyType,
} from "@gltf-transform/core";
import * as VRM0Type from "@pixiv/types-vrm-0.0";
import { VRM0 as NAME } from "../constants.ts";
import VRM0MetaProp from "./vrm0-meta-prop.ts";
import VRM0HumanoidProp from "./vrm0-humanoid-prop.ts";

interface IVRM0Prop extends IProperty {
  metaProp: VRM0MetaProp;
  //   specVersion?: "0.0";
  exporterVersion: string;
  humanoidProp: VRM0HumanoidProp;
  serializedHumanoid: string;
  serializedFirstPerson: string;
  serializedBlendShapeMaster: string;
  serializedSecondaryAnimation: string;
  serializedMaterialProperties: string;
}

export default class VRM0Prop extends ExtensionProperty<IVRM0Prop> {
  public static EXTENSION_NAME = NAME;
  public declare extensionName: typeof NAME;
  public declare propertyType: "VRM";
  public declare parentTypes: [PropertyType.ROOT];

  protected init(): void {
    this.extensionName = NAME;
    this.propertyType = "VRM";
    this.parentTypes = [PropertyType.ROOT];
  }

  protected getDefaults(): Nullable<IVRM0Prop> {
    return Object.assign(super.getDefaults() as IProperty, {
      metaProp: null,
      exporterVersion: "VRM Sparks 0.0",
      humanoidProp: null,
      serializedHumanoid: "{}",
      serializedFirstPerson: "{}",
      serializedBlendShapeMaster: "{}",
      serializedSecondaryAnimation: "{}",
      serializedMaterialProperties: "[]",
    });
  }

  public setExporterVersion(exporterVersion: string): this {
    return this.set("exporterVersion", exporterVersion);
  }

  public getExporterVersion() {
    return this.get("exporterVersion");
  }

  public setMetaProp(meta: VRM0MetaProp): this {
    return this.setRef("metaProp", meta);
  }
  public getMetaProp(): VRM0MetaProp | null {
    return this.getRef("metaProp");
  }

  public setHumanoid(humanoid: VRM0Type.Humanoid): this {
    return this.set("serializedHumanoid", JSON.stringify(humanoid));
  }
  public getHumanoid(): VRM0Type.Humanoid | undefined {
    const serializedHumanoid = this.get("serializedHumanoid");
    if (serializedHumanoid) {
      return JSON.parse(serializedHumanoid) as VRM0Type.Humanoid;
    }
    return undefined;
  }

  public setHumanoidProp(humanoidProp: VRM0HumanoidProp): this {
    return this.setRef("humanoidProp", humanoidProp);
  }
  public getHumanoidProp(): VRM0HumanoidProp | null {
    return this.getRef("humanoidProp");
  }

  public setFirstPerson(firstPerson: VRM0Type.FirstPerson): this {
    return this.set("serializedFirstPerson", JSON.stringify(firstPerson));
  }

  public getFirstPerson(): VRM0Type.FirstPerson | undefined {
    const serializedFirstPerson = this.get("serializedFirstPerson");

    if (serializedFirstPerson) {
      return JSON.parse(serializedFirstPerson) as VRM0Type.FirstPerson;
    }

    return undefined;
  }

  public setBlendShapeMaster(blendShapeMaster: VRM0Type.BlendShape): this {
    return this.set(
      "serializedBlendShapeMaster",
      JSON.stringify(blendShapeMaster)
    );
  }

  public getBlendShapeMaster(): VRM0Type.BlendShape | undefined {
    const serializedBlendShapeMaster = this.get("serializedBlendShapeMaster");

    if (serializedBlendShapeMaster) {
      return JSON.parse(serializedBlendShapeMaster) as VRM0Type.BlendShape;
    }

    return undefined;
  }

  public setSecondaryAnimation(
    secondaryAnimation: VRM0Type.SecondaryAnimation
  ) {
    return this.set(
      "serializedSecondaryAnimation",
      JSON.stringify(secondaryAnimation)
    );
  }

  public getSecondaryAnimation(): VRM0Type.SecondaryAnimation | undefined {
    const serializedSecondaryAnimation = this.get(
      "serializedSecondaryAnimation"
    );

    if (serializedSecondaryAnimation) {
      return JSON.parse(
        serializedSecondaryAnimation
      ) as VRM0Type.SecondaryAnimation;
    }

    return undefined;
  }

  public setMaterialProperties(materialProperties: VRM0Type.Material[]): this {
    return this.set(
      "serializedMaterialProperties",
      JSON.stringify(materialProperties)
    );
  }

  public getMaterialProperties(): VRM0Type.Material[] | undefined {
    const serializedMaterialProperties = this.get(
      "serializedMaterialProperties"
    );

    if (serializedMaterialProperties) {
      return JSON.parse(serializedMaterialProperties) as VRM0Type.Material[];
    }

    return undefined;
  }
}
