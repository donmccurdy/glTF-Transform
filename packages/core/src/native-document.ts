/**
 * # NativeDocument
 *
 * *Raw glTF asset, with its JSON and binary resources.*
 *
 * A NativeDocument is a raw glTF model, without helper functions for modification. In typical
 * cases, code should work with {@link Document} and not NativeDocument objects.
 *
 * In certain cases, however it might be necessary to construct a NativeDocument in order to load
 * data that is in memory, or which the I/O utilities cannot otherwise access. In that case you
 * might assemble the NativeDocument yourself, then convert it to a Document with
 * {@link PlatformIO.createDocument}(nativeDocument).
 *
 * Prefer {@link NodeIO} or {@link WebIO} utilities, or {@link Document} methods, over directly
 * dealing with NativeDocument objects.
 *
 * Usage:
 *
 * ```ts
 * const nativeDocument = {
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
 * const doc = new NodeIO().createDocument(nativeDocument);
 * ```
 *
 * @category Documents
 */
export interface NativeDocument {
	json: GLTF.IGLTF;
	resources: {[s: string]: ArrayBuffer};
}
