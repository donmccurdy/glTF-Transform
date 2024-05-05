import { Texture as TextureDef } from '@gltf-transform/core';
import { CompressedTexture, Texture, WebGLRenderer, REVISION } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

const TRANSCODER_PATH = `https://unpkg.com/three@0.${REVISION}.x/examples/jsm/libs/basis/`;

// Use a single KTX2Loader instance to pool Web Workers.
function createKTX2Loader() {
	const renderer = new WebGLRenderer();
	const loader = new KTX2Loader().detectSupport(renderer).setTranscoderPath(TRANSCODER_PATH);
	renderer.dispose();
	return loader;
}

/** Generates a Texture from a Data URI, or otherh URL. */
function createTexture(name: string, uri: string): Texture {
	const imageEl = document.createElement('img');
	imageEl.src = uri;
	const texture = new Texture(imageEl);
	texture.name = name;
	texture.flipY = false;
	return texture;
}

// Placeholder images.
const NULL_IMAGE_URI =
	// eslint-disable-next-line max-len
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAABNJREFUGFdj/M9w9z8DEmAkXQAAyCMLcU6pckIAAAAASUVORK5CYII=';
const LOADING_IMAGE_URI =
	// eslint-disable-next-line max-len
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=';

export interface ImageProvider {
	readonly nullTexture: Texture;
	readonly loadingTexture: Texture;
	initTexture(textureDef: TextureDef): Promise<void>;
	getTexture(textureDef: TextureDef): Promise<Texture | CompressedTexture>;
	setKTX2Loader(loader: KTX2Loader): this;
	clear(): void;
}

export class NullImageProvider implements ImageProvider {
	readonly nullTexture = createTexture('__NULL_TEXTURE', NULL_IMAGE_URI);
	readonly loadingTexture = createTexture('__LOADING_TEXTURE', LOADING_IMAGE_URI);

	async initTexture(_textureDef: TextureDef): Promise<void> {}
	async getTexture(_: TextureDef): Promise<Texture | CompressedTexture> {
		return this.nullTexture;
	}
	setKTX2Loader(_loader: KTX2Loader): this {
		return this;
	}
	clear(): void {}
}

export class DefaultImageProvider implements ImageProvider {
	readonly nullTexture = createTexture('__NULL_TEXTURE', NULL_IMAGE_URI);
	readonly loadingTexture = createTexture('__LOADING_TEXTURE', LOADING_IMAGE_URI);

	private _cache = new Map<ArrayBuffer, Texture | CompressedTexture>();
	private _ktx2Loader: KTX2Loader | null = null;

	async initTexture(textureDef: TextureDef): Promise<void> {
		await this.getTexture(textureDef);
	}

	async getTexture(textureDef: TextureDef): Promise<Texture | CompressedTexture> {
		const image = textureDef.getImage()!;
		const mimeType = textureDef.getMimeType();

		let texture = this._cache.get(image);

		if (texture) return texture;

		texture = mimeType === 'image/ktx2' ? await this._loadKTX2Image(image) : await this._loadImage(image, mimeType);

		this._cache.set(image, texture);
		return texture;
	}

	setKTX2Loader(loader: KTX2Loader): this {
		this._ktx2Loader = loader;
		return this;
	}

	clear(): void {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [_, texture] of this._cache) {
			texture.dispose();
		}
		this._cache.clear();
	}

	dispose() {
		this.clear();
		if (this._ktx2Loader) this._ktx2Loader.dispose();
	}

	/** Load PNG, JPEG, or other browser-suppored image format. */
	private async _loadImage(image: ArrayBuffer, mimeType: string): Promise<Texture> {
		return new Promise((resolve, reject) => {
			const blob = new Blob([image], { type: mimeType });
			const imageURL = URL.createObjectURL(blob);
			const imageEl = document.createElement('img');

			const texture = new Texture(imageEl);
			texture.flipY = false;

			imageEl.src = imageURL;
			imageEl.onload = () => {
				URL.revokeObjectURL(imageURL);
				resolve(texture);
			};
			imageEl.onerror = reject;
		});
	}

	/** Load KTX2 + Basis Universal compressed texture format. */
	private async _loadKTX2Image(image: ArrayBuffer): Promise<CompressedTexture> {
		this._ktx2Loader ||= createKTX2Loader();
		const blob = new Blob([image], { type: 'image/ktx2' });
		const imageURL = URL.createObjectURL(blob);
		const texture = await this._ktx2Loader.loadAsync(imageURL);
		URL.revokeObjectURL(imageURL);
		return texture;
	}
}
