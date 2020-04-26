/**
 * A raw glTF asset, with its JSON and binary resources.
 *
 * An Asset is a complete glTF model, with no helper functions for easy modification. In typical
 * usage, you should not have to deal with an Asset object: glTF files are loaded with the
 * {@link NodeIO} or {@link WebIO} utilities, which return a {@link Container}. The container
 * provides useful abstractions for common tasks, and avoids the need to deal with raw array
 * indices for references. After modifications are complete, the model can be written to disk
 * or to an ArrayBuffer using the same I/O utilities.
 *
 * In certain cases, however it might be necessary to construct an Asset in order to load data
 * that is in memory, or which the I/O utilities cannot otherwise access. In that case you might
 * assemble the Asset yourself, then convert it to a Container with
 * {@link PlatformIO.assetToContainer}(asset).
 *
 * Prefer {@link NodeIO} or {@link WebIO} utilities, or {@link Container} methods, over directly
 * dealing with Asset objects.
 *
 * Usage:
 *
 * ```ts
 * const asset = {
 * 	// glTF JSON schema.
 * 	json: {
 * 		asset: {version: '2.0'},
 * 		images: [{uri: 'image1.png'}, {uri: 'image2.png'}]
 * 	},
 *
 * 	// URI → ArrayBuffer mapping.
 * 	resources: {
 * 		'image1.png': BufferUtils.trim(fs.readFileSync('image1.png')),
 * 		'image2.png': BufferUtils.trim(fs.readFileSync('image2.png')),
 * 	}
 * };
 *
 * const container = new NodeIO().assetToContainer(asset);
 * ```
 *
 * @category I/O
 */
export interface Asset {
	json: GLTF.IGLTF;
	resources: {[s: string]: ArrayBuffer};
}
