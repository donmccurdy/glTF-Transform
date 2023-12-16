import { PropertyType } from "@gltf-transform/core";
import MaterialMToonProp from "../../material-mtoon-prop.js";
import { VRM0 as NAME } from "../constants.js";

export default class VRM0MaterialMToonProp extends MaterialMToonProp {
  protected init(): void {
    this.extensionName = NAME;
    this.propertyType = "VRMC_materialsMToon";
    this.parentTypes = [PropertyType.MATERIAL];
  }
}
