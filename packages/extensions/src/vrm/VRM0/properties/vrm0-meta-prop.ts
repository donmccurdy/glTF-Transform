import { PropertyType } from "@gltf-transform/core";
import { MetaProp } from "../../meta-prop.js";
import { VRM0 as NAME } from "../constants.js";

export default class VRM0MetaProp extends MetaProp {
  protected init(): void {
    this.extensionName = NAME;
    this.propertyType = "VRMC_vrm";
    this.parentTypes = [PropertyType.ROOT];
  }
}
