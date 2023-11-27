import { Extension } from "@gltf-transform/core";
// import * as VRM1Def from "@pixiv/types-vrmc-vrm-1.0";
import { VRMC_VRM } from "./constants.ts";

const NAME = VRMC_VRM;

export default class VRM1VRM extends Extension {
  public readonly extensionName = NAME;
  public static readonly EXTENSION_NAME = NAME;

  public read(): this {
    return this;
  }

  public write(): this {
    return this;
  }
}
