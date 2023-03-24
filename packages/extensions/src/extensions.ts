/** @module extensions */

import { EXTMeshGPUInstancing } from './ext-mesh-gpu-instancing/index.js';
import { EXTMeshoptCompression } from './ext-meshopt-compression/index.js';
import { EXTTextureAVIF } from './ext-texture-avif/index.js';
import { EXTTextureWebP } from './ext-texture-webp/index.js';
import { KHRDracoMeshCompression } from './khr-draco-mesh-compression/index.js';
import { KHRLightsPunctual } from './khr-lights-punctual/index.js';
import { KHRMaterialsAnisotropy } from './khr-materials-anisotropy/index.js';
import { KHRMaterialsClearcoat } from './khr-materials-clearcoat/index.js';
import { KHRMaterialsEmissiveStrength } from './khr-materials-emissive-strength/index.js';
import { KHRMaterialsIOR } from './khr-materials-ior/index.js';
import { KHRMaterialsIridescence } from './khr-materials-iridescence/index.js';
import { KHRMaterialsPBRSpecularGlossiness } from './khr-materials-pbr-specular-glossiness/index.js';
import { KHRMaterialsSheen } from './khr-materials-sheen/index.js';
import { KHRMaterialsSpecular } from './khr-materials-specular/index.js';
import { KHRMaterialsTransmission } from './khr-materials-transmission/index.js';
import { KHRMaterialsUnlit } from './khr-materials-unlit/index.js';
import { KHRMaterialsVariants } from './khr-materials-variants/index.js';
import { KHRMaterialsVolume } from './khr-materials-volume/index.js';
import { KHRMeshQuantization } from './khr-mesh-quantization/index.js';
import { KHRTextureBasisu } from './khr-texture-basisu/index.js';
import { KHRTextureTransform } from './khr-texture-transform/index.js';
import { KHRXMP } from './khr-xmp-json-ld/index.js';

export const KHRONOS_EXTENSIONS = [
	KHRDracoMeshCompression,
	KHRLightsPunctual,
	KHRMaterialsAnisotropy,
	KHRMaterialsClearcoat,
	KHRMaterialsEmissiveStrength,
	KHRMaterialsIOR,
	KHRMaterialsIridescence,
	KHRMaterialsPBRSpecularGlossiness,
	KHRMaterialsSpecular,
	KHRMaterialsSheen,
	KHRMaterialsTransmission,
	KHRMaterialsUnlit,
	KHRMaterialsVariants,
	KHRMaterialsVolume,
	KHRMeshQuantization,
	KHRTextureBasisu,
	KHRTextureTransform,
	KHRXMP,
];

export const ALL_EXTENSIONS = [
	EXTMeshGPUInstancing,
	EXTMeshoptCompression,
	EXTTextureAVIF,
	EXTTextureWebP,
	...KHRONOS_EXTENSIONS,
];

export * from './ext-mesh-gpu-instancing/index.js';
export * from './ext-meshopt-compression/index.js';
export * from './ext-texture-avif/index.js';
export * from './ext-texture-webp/index.js';
export * from './khr-draco-mesh-compression/index.js';
export * from './khr-lights-punctual/index.js';
export * from './khr-materials-anisotropy/index.js';
export * from './khr-materials-clearcoat/index.js';
export * from './khr-materials-emissive-strength/index.js';
export * from './khr-materials-ior/index.js';
export * from './khr-materials-iridescence/index.js';
export * from './khr-materials-sheen/index.js';
export * from './khr-materials-specular/index.js';
export * from './khr-materials-pbr-specular-glossiness/index.js';
export * from './khr-materials-transmission/index.js';
export * from './khr-materials-unlit/index.js';
export * from './khr-materials-variants/index.js';
export * from './khr-materials-volume/index.js';
export * from './khr-mesh-quantization/index.js';
export * from './khr-texture-basisu/index.js';
export * from './khr-texture-transform/index.js';
export * from './khr-xmp-json-ld/index.js';
