/** @module extensions */

import { MeshGPUInstancing } from './ext-mesh-gpu-instancing';
import { MeshoptCompression } from './ext-meshopt-compression';
import { TextureWebP } from './ext-texture-webp';
import { DracoMeshCompression } from './khr-draco-mesh-compression';
import { LightsPunctual } from './khr-lights-punctual';
import { MaterialsClearcoat } from './khr-materials-clearcoat';
import { MaterialsIOR } from './khr-materials-ior';
import { MaterialsPBRSpecularGlossiness } from './khr-materials-pbr-specular-glossiness';
import { MaterialsSheen } from './khr-materials-sheen';
import { MaterialsSpecular } from './khr-materials-specular';
import { MaterialsTransmission } from './khr-materials-transmission';
import { MaterialsUnlit } from './khr-materials-unlit';
import { MaterialsVariants } from './khr-materials-variants';
import { MaterialsVolume } from './khr-materials-volume';
import { MeshQuantization } from './khr-mesh-quantization';
import { TextureBasisu } from './khr-texture-basisu';
import { TextureTransform } from './khr-texture-transform';

export const KHRONOS_EXTENSIONS = [
	DracoMeshCompression,
	LightsPunctual,
	MaterialsClearcoat,
	MaterialsIOR,
	MaterialsPBRSpecularGlossiness,
	MaterialsSpecular,
	MaterialsSheen,
	MaterialsTransmission,
	MaterialsUnlit,
	MaterialsVariants,
	MaterialsVolume,
	MeshQuantization,
	TextureBasisu,
	TextureTransform,
];

export const ALL_EXTENSIONS = [
	MeshGPUInstancing,
	MeshoptCompression,
	TextureWebP,
	...KHRONOS_EXTENSIONS,
];

export * from './ext-mesh-gpu-instancing';
export * from './ext-meshopt-compression';
export * from './ext-texture-webp';
export * from './khr-draco-mesh-compression';
export * from './khr-lights-punctual';
export * from './khr-materials-clearcoat';
export * from './khr-materials-ior';
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
