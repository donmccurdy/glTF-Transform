export const EXT_MESH_GPU_INSTANCING = 'EXT_mesh_gpu_instancing';
export const EXT_MESHOPT_COMPRESSION = 'EXT_meshopt_compression';
export const EXT_TEXTURE_WEBP = 'EXT_texture_webp';
export const KHR_DRACO_MESH_COMPRESSION = 'KHR_draco_mesh_compression';
export const KHR_LIGHTS_PUNCTUAL = 'KHR_lights_punctual';
export const KHR_MATERIALS_CLEARCOAT = 'KHR_materials_clearcoat';
export const KHR_MATERIALS_EMISSIVE_STRENGTH = 'KHR_materials_emissive_strength';
export const KHR_MATERIALS_IOR = 'KHR_materials_ior';
export const KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS = 'KHR_materials_pbrSpecularGlossiness';
export const KHR_MATERIALS_SHEEN = 'KHR_materials_sheen';
export const KHR_MATERIALS_SPECULAR = 'KHR_materials_specular';
export const KHR_MATERIALS_TRANSMISSION = 'KHR_materials_transmission';
export const KHR_MATERIALS_UNLIT = 'KHR_materials_unlit';
export const KHR_MATERIALS_VOLUME = 'KHR_materials_volume';
export const KHR_MATERIALS_VARIANTS = 'KHR_materials_variants';
export const KHR_MESH_QUANTIZATION = 'KHR_mesh_quantization';
export const KHR_TEXTURE_BASISU = 'KHR_texture_basisu';
export const KHR_TEXTURE_TRANSFORM = 'KHR_texture_transform';

/**
 * TypeScript utility for nullable types.
 * @internal
 */
export type Nullable<T> = { [P in keyof T]: T[P] | null };
