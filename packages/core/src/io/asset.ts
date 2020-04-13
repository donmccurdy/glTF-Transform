export interface Asset {
	json: GLTF.IGLTF;
	resources: {[s: string]: ArrayBuffer};
}
