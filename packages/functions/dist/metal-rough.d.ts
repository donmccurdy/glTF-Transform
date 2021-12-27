import { Transform } from '@gltf-transform/core';
export interface MetalRoughOptions {
}
/**
 * Convert {@link Material}s from spec/gloss PBR workflow to metal/rough PBR workflow,
 * removing `KHR_materials_pbrSpecularGlossiness` and adding `KHR_materials_ior` and
 * `KHR_materials_specular`. The metal/rough PBR workflow is preferred for most use cases,
 * and is a prerequisite for other advanced PBR extensions provided by glTF.
 *
 * No options are currently implemented for this function.
 */
export declare function metalRough(_options?: MetalRoughOptions): Transform;
