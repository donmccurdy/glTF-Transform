import { MaterialsClearcoat } from './khr-materials-clearcoat';
import { MaterialsUnlit } from './khr-materials-unlit';
import { MeshQuantization } from './khr-mesh-quantization';
import { TextureBasisu } from './khr-texture-basisu';

export * from './khr-materials-clearcoat';
export * from './khr-materials-unlit';
export * from './khr-mesh-quantization';
export * from './khr-texture-basisu';

export const KHRONOS_EXTENSIONS = [ MaterialsClearcoat, MaterialsUnlit, MeshQuantization, TextureBasisu ];
