import { MaterialsClearcoat } from './khr-materials-clearcoat';
import { MaterialsIOR } from './khr-materials-ior';
import { MaterialsPBRSpecularGlossiness } from './khr-materials-pbr-specular-glossiness';
import { MaterialsSpecular } from './khr-materials-specular';
import { MaterialsTransmission } from './khr-materials-transmission';
import { MaterialsUnlit } from './khr-materials-unlit';
import { MeshQuantization } from './khr-mesh-quantization';
import { TextureBasisu } from './khr-texture-basisu';

export * from './khr-materials-clearcoat';
export * from './khr-materials-ior';
export * from './khr-materials-specular';
export * from './khr-materials-pbr-specular-glossiness';
export * from './khr-materials-transmission';
export * from './khr-materials-unlit';
export * from './khr-mesh-quantization';
export * from './khr-texture-basisu';

export const KHRONOS_EXTENSIONS = [
	MaterialsClearcoat,
	MaterialsIOR,
	MaterialsPBRSpecularGlossiness,
	MaterialsSpecular,
	MaterialsTransmission,
	MaterialsUnlit,
	MeshQuantization,
	TextureBasisu,
];
