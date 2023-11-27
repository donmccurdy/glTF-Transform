import { PropertyType } from "@gltf-transform/core";
import MaterialMToonProp from "../../material-mtoon-prop.ts";
import { VRM0 as NAME } from "../constants.ts";

export default class VRM0MaterialMToonProp extends MaterialMToonProp {
  protected init(): void {
    this.extensionName = NAME;
    this.propertyType = "VRMC_materialsMToon";
    this.parentTypes = [PropertyType.MATERIAL];
  }
}
