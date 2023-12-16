import { PropertyType } from "@gltf-transform/core";
import MaterialMToon from "../../material-mtoon-prop.js";
import { VRMC_MATERIALS_MTOON as NAME } from "../constants.js";

export default class VRM1MaterialMToon extends MaterialMToon {
  public static EXTENSION_NAME = NAME;
  public declare extensionName: typeof NAME;
  public declare propertyType: "VRMC_materialsMToon";
  public declare parentTypes: [PropertyType.MATERIAL];

  protected init(): void {
    this.extensionName = NAME;
    this.propertyType = "VRMC_materialsMToon";
    this.parentTypes = [PropertyType.MATERIAL];
  }
}
