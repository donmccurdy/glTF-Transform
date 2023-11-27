import { PropertyType } from "@gltf-transform/core";
import { VRM0 as NAME } from "../constants.js";
import { HumanoidProp } from "../../humanoid-prop.js";

export default class VRM0HumanoidProp extends HumanoidProp {
  protected init(): void {
    this.extensionName = NAME;
    this.propertyType = "VRMC_vrm.humanoid";
    this.parentTypes = [PropertyType.ROOT];
  }
}
