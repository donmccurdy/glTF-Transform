import { PropertyType } from "@gltf-transform/core";
import { MetaProp } from "../../meta-prop.ts";
import { VRM0 as NAME } from "../constants.ts";

export default class VRM0MetaProp extends MetaProp {
  protected init(): void {
    this.extensionName = NAME;
    this.propertyType = "VRMC_vrm";
    this.parentTypes = [PropertyType.ROOT];
  }
}
