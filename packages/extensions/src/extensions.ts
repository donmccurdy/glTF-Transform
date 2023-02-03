/** @module extensions */

import { EXTMeshGPUInstancing } from './ext-mesh-gpu-instancing';
import { EXTMeshoptCompression } from './ext-meshopt-compression';
import { EXTTextureAVIF } from './ext-texture-avif';
import { EXTTextureWebP } from './ext-texture-webp';
import { KHRDracoMeshCompression } from './khr-draco-mesh-compression';
import { KHRLightsPunctual } from './khr-lights-punctual';
import { KHRMaterialsClearcoat } from './khr-materials-clearcoat';
import { KHRMaterialsEmissiveStrength } from './khr-materials-emissive-strength';
import { KHRMaterialsIOR } from './khr-materials-ior';
import { KHRMaterialsIridescence } from './khr-materials-iridescence';
import { KHRMaterialsPBRSpecularGlossiness } from './khr-materials-pbr-specular-glossiness';
import { KHRMaterialsSheen } from './khr-materials-sheen';
import { KHRMaterialsSpecular } from './khr-materials-specular';
import { KHRMaterialsTransmission } from './khr-materials-transmission';
import { KHRMaterialsUnlit } from './khr-materials-unlit';
import { KHRMaterialsVariants } from './khr-materials-variants';
import { KHRMaterialsVolume } from './khr-materials-volume';
import { KHRMeshQuantization } from './khr-mesh-quantization';
import { KHRTextureBasisu } from './khr-texture-basisu';
import { KHRTextureTransform } from './khr-texture-transform';
import { KHRXMP } from './khr-xmp-json-ld';

export const KHRONOS_EXTENSIONS = [
	KHRDracoMeshCompression,
	KHRLightsPunctual,
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

export * from './ext-mesh-gpu-instancing';
export * from './ext-meshopt-compression';
export * from './ext-texture-avif';
export * from './ext-texture-webp';
export * from './khr-draco-mesh-compression';
export * from './khr-lights-punctual';
export * from './khr-materials-clearcoat';
export * from './khr-materials-emissive-strength';
export * from './khr-materials-ior';
export * from './khr-materials-iridescence';
export * from './khr-materials-sheen';
export * from './khr-materials-specular';
export * from './khr-materials-pbr-specular-glossiness';
export * from './khr-materials-transmission';
export * from './khr-materials-unlit';
export * from './khr-materials-variants';
export * from './khr-materials-volume';
export * from './khr-mesh-quantization';
export * from './khr-texture-basisu';
export * from './khr-texture-transform';
export * from './khr-xmp-json-ld';
