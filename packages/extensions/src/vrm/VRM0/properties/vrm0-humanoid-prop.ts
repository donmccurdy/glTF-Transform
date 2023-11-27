import { PropertyType } from "@gltf-transform/core";
import { VRM0 as NAME } from "../constants.ts";
import { HumanoidProp } from "../../humanoid-prop.ts";

export default class VRM0HumanoidProp extends HumanoidProp {
  protected init(): void {
    this.extensionName = NAME;
    this.propertyType = "VRMC_vrm.humanoid";
    this.parentTypes = [PropertyType.ROOT];
  }
}
