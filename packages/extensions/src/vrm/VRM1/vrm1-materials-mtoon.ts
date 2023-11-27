import { Extension, ReaderContext, WriterContext } from "@gltf-transform/core";
import { VRMC_MATERIALS_MTOON } from "./constants.ts";
import VRM1MaterialMToonProp from "./properties/vrm1-material-mtoon-prop.ts";

const NAME = VRMC_MATERIALS_MTOON;

export default class VRM1MaterialsMToon extends Extension {
  public readonly extensionName = NAME;
  public static readonly EXTENSION_NAME = NAME;

  public createVRM1MaterialMToonProp(): VRM1MaterialMToonProp {
    return new VRM1MaterialMToonProp(this.document.getGraph());
  }

  public read(context: ReaderContext): this {
    const materialDefs = context.jsonDoc.json.materials || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME]) {
        context.materials[materialIndex].setExtension(
          NAME,
          this.createVRM1MaterialMToonProp()
        );
      }
    });

    return this;
  }

  public write(context: WriterContext): this {
    const jsonDoc = context.jsonDoc;

    this.document
      .getRoot()
      .listMaterials()
      .forEach((material) => {
        const materialMToonExtension =
          material.getExtension<VRM1MaterialMToonProp>(NAME);

        if (materialMToonExtension) {
          const materialIndex = context.materialIndexMap.get(material)!;
          const materialDef = jsonDoc.json.materials![materialIndex];
          materialDef.extensions = materialDef.extensions || {};
          // materialDef.extensions[NAME] =
          //   materialMToonExtension.getVRMCMaterialsMToon();
        }
      });

    return this;
  }
}
