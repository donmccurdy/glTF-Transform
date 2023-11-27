import {
  IProperty,
  Nullable,
  ExtensionProperty,
  PropertyType,
} from "@gltf-transform/core";
import * as VRM1Def from "@pixiv/types-vrmc-vrm-1.0";
import { VRM0 as VRM0NAME } from "./VRM0/constants.ts";
import { VRMC_VRM as VRM1NAME } from "./VRM1/constants.ts";
import { HumanoidHumanBoneProp } from "./humanoid-human-bone-prop.ts";

export interface IHumanoidProp extends IProperty {
  hips: HumanoidHumanBoneProp;
  spine: HumanoidHumanBoneProp;
  chest: HumanoidHumanBoneProp;
  upperChest: HumanoidHumanBoneProp;
  neck: HumanoidHumanBoneProp;
  head: HumanoidHumanBoneProp;
  leftEye: HumanoidHumanBoneProp;
  rightEye: HumanoidHumanBoneProp;
  jaw: HumanoidHumanBoneProp;
  leftUpperLeg: HumanoidHumanBoneProp;
  leftLowerLeg: HumanoidHumanBoneProp;
  leftFoot: HumanoidHumanBoneProp;
  leftToes: HumanoidHumanBoneProp;
  rightUpperLeg: HumanoidHumanBoneProp;
  rightLowerLeg: HumanoidHumanBoneProp;
  rightFoot: HumanoidHumanBoneProp;
  rightToes: HumanoidHumanBoneProp;
  leftShoulder: HumanoidHumanBoneProp;
  leftUpperArm: HumanoidHumanBoneProp;
  leftLowerArm: HumanoidHumanBoneProp;
  leftHand: HumanoidHumanBoneProp;
  rightShoulder: HumanoidHumanBoneProp;
  rightUpperArm: HumanoidHumanBoneProp;
  rightLowerArm: HumanoidHumanBoneProp;
  rightHand: HumanoidHumanBoneProp;
  leftThumbMetacarpal: HumanoidHumanBoneProp;
  leftThumbProximal: HumanoidHumanBoneProp;
  leftThumbDistal: HumanoidHumanBoneProp;
  leftIndexProximal: HumanoidHumanBoneProp;
  leftIndexIntermediate: HumanoidHumanBoneProp;
  leftIndexDistal: HumanoidHumanBoneProp;
  leftMiddleProximal: HumanoidHumanBoneProp;
  leftMiddleIntermediate: HumanoidHumanBoneProp;
  leftMiddleDistal: HumanoidHumanBoneProp;
  leftRingProximal: HumanoidHumanBoneProp;
  leftRingIntermediate: HumanoidHumanBoneProp;
  leftRingDistal: HumanoidHumanBoneProp;
  leftLittleProximal: HumanoidHumanBoneProp;
  leftLittleIntermediate: HumanoidHumanBoneProp;
  leftLittleDistal: HumanoidHumanBoneProp;
  rightThumbMetacarpal: HumanoidHumanBoneProp;
  rightThumbProximal: HumanoidHumanBoneProp;
  rightThumbDistal: HumanoidHumanBoneProp;
  rightIndexProximal: HumanoidHumanBoneProp;
  rightIndexIntermediate: HumanoidHumanBoneProp;
  rightIndexDistal: HumanoidHumanBoneProp;
  rightMiddleProximal: HumanoidHumanBoneProp;
  rightMiddleIntermediate: HumanoidHumanBoneProp;
  rightMiddleDistal: HumanoidHumanBoneProp;
  rightRingProximal: HumanoidHumanBoneProp;
  rightRingIntermediate: HumanoidHumanBoneProp;
  rightRingDistal: HumanoidHumanBoneProp;
  rightLittleProximal: HumanoidHumanBoneProp;
  rightLittleIntermediate: HumanoidHumanBoneProp;
  rightLittleDistal: HumanoidHumanBoneProp;
}

export class HumanoidProp extends ExtensionProperty<IHumanoidProp> {
  public declare extensionName: typeof VRM0NAME | typeof VRM1NAME;
  public declare propertyType: "VRMC_vrm.humanoid";
  public declare parentTypes: [PropertyType.ROOT];

  protected init(): void {
    this.extensionName = VRM1NAME;
    this.propertyType = "VRMC_vrm.humanoid";
    this.parentTypes = [PropertyType.ROOT];
  }

  protected getDefaults(): Nullable<IHumanoidProp> {
    return Object.assign(super.getDefaults() as IProperty, {
      hips: null,
      spine: null,
      chest: null,
      upperChest: null,
      neck: null,
      head: null,
      leftEye: null,
      rightEye: null,
      jaw: null,
      leftUpperLeg: null,
      leftLowerLeg: null,
      leftFoot: null,
      leftToes: null,
      rightUpperLeg: null,
      rightLowerLeg: null,
      rightFoot: null,
      rightToes: null,
      leftShoulder: null,
      leftUpperArm: null,
      leftLowerArm: null,
      leftHand: null,
      rightShoulder: null,
      rightUpperArm: null,
      rightLowerArm: null,
      rightHand: null,
      leftThumbMetacarpal: null,
      leftThumbProximal: null,
      leftThumbDistal: null,
      leftIndexProximal: null,
      leftIndexIntermediate: null,
      leftIndexDistal: null,
      leftMiddleProximal: null,
      leftMiddleIntermediate: null,
      leftMiddleDistal: null,
      leftRingProximal: null,
      leftRingIntermediate: null,
      leftRingDistal: null,
      leftLittleProximal: null,
      leftLittleIntermediate: null,
      leftLittleDistal: null,
      rightThumbMetacarpal: null,
      rightThumbProximal: null,
      rightThumbDistal: null,
      rightIndexProximal: null,
      rightIndexIntermediate: null,
      rightIndexDistal: null,
      rightMiddleProximal: null,
      rightMiddleIntermediate: null,
      rightMiddleDistal: null,
      rightRingProximal: null,
      rightRingIntermediate: null,
      rightRingDistal: null,
      rightLittleProximal: null,
      rightLittleIntermediate: null,
      rightLittleDistal: null,
    });
  }

  public getHumanoidHumanBoneProp(
    humanoidHumanBoneName: VRM1Def.HumanoidHumanBoneName
  ): HumanoidHumanBoneProp | null {
    return this.getRef(humanoidHumanBoneName);
  }

  public setHumanoidHumanBoneProp(
    humanoidHumanBoneName: VRM1Def.HumanoidHumanBoneName,
    humanoidHumanBoneProp: HumanoidHumanBoneProp
  ): this {
    return this.setRef(humanoidHumanBoneName, humanoidHumanBoneProp);
  }
}
