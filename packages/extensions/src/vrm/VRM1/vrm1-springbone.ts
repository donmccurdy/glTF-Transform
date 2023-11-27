import { Extension } from "@gltf-transform/core";
import { VRMC_SPRINGBONE } from "./constants.ts";

const NAME = VRMC_SPRINGBONE;

export default class VRM1SpringBone extends Extension {
  public readonly extensionName = NAME;
  public static readonly EXTENSION_NAME = NAME;

  public read(): this {
    return this;
  }

  public write(): this {
    return this;
  }
}
