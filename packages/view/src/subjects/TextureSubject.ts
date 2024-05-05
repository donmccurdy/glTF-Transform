import { Texture } from 'three';
import { Texture as TextureDef } from '@gltf-transform/core';
import type { DocumentViewSubjectAPI } from '../DocumentViewImpl.js';
import { Subject } from './Subject.js';

/** @internal */
export class TextureSubject extends Subject<TextureDef, Texture> {
	private _image: ArrayBuffer | null = null;

	constructor(documentView: DocumentViewSubjectAPI, def: TextureDef) {
		super(documentView, def, documentView.imageProvider.loadingTexture, documentView.texturePool);
	}

	update() {
		const def = this.def;
		const value = this.value;

		if (def.getName() !== value.name) {
			value.name = def.getName();
		}

		const image = def.getImage() as ArrayBuffer;
		if (image !== this._image) {
			this._image = image;
			if (this.value !== this._documentView.imageProvider.loadingTexture) {
				this.pool.releaseBase(this.value);
			}
			this._documentView.imageProvider.getTexture(def).then((texture: Texture) => {
				this.value = this.pool.requestBase(texture);
				this.publishAll(); // TODO(perf): Might be wasting cycles here.
			});
		}
	}

	dispose() {
		super.dispose();
	}
}
