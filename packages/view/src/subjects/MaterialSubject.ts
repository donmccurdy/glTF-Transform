import {
	DoubleSide,
	FrontSide,
	Material,
	MeshBasicMaterial,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	Texture,
	SRGBColorSpace,
	NoColorSpace,
	ColorSpace,
} from 'three';
import {
	ExtensionProperty as ExtensionPropertyDef,
	Material as MaterialDef,
	Texture as TextureDef,
	TextureInfo as TextureInfoDef,
	vec3,
} from '@gltf-transform/core';
import {
	Anisotropy,
	Clearcoat,
	EmissiveStrength,
	IOR,
	Iridescence,
	Sheen,
	Specular,
	Transmission,
	Volume,
} from '@gltf-transform/extensions';
import type { DocumentViewImpl } from '../DocumentViewImpl.js';
import { eq } from '../utils/index.js';
import { Subject } from './Subject.js';
import { RefListObserver, RefObserver } from '../observers/index.js';
import { Subscription } from '../constants.js';
import { TextureParams, TexturePool, ValuePool } from '../pools/index.js';

const _vec3: vec3 = [0, 0, 0];

enum ShadingModel {
	UNLIT = 0,
	STANDARD = 1,
	PHYSICAL = 2,
}

// TODO(feat): Missing change listeners on TextureInfo... delegate?

/** @internal */
export class MaterialSubject extends Subject<MaterialDef, Material> {
	protected readonly extensions = new RefListObserver<ExtensionPropertyDef, ExtensionPropertyDef>(
		'extensions',
		this._documentView,
	);

	protected readonly baseColorTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'baseColorTexture',
		this._documentView,
	);
	protected readonly emissiveTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'emissiveTexture',
		this._documentView,
	);
	protected readonly normalTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'normalTexture',
		this._documentView,
	);
	protected readonly occlusionTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'occlusionTexture',
		this._documentView,
	);
	protected readonly metallicRoughnessTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'metallicRoughnessTexture',
		this._documentView,
	);

	// KHR_materials_anisotropy
	protected readonly anisotropyTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'anisotropyTexture',
		this._documentView,
	);

	// KHR_materials_clearcoat
	protected readonly clearcoatTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'clearcoatTexture',
		this._documentView,
	);
	protected readonly clearcoatRoughnessTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'clearcoatRoughnessTexture',
		this._documentView,
	);
	protected readonly clearcoatNormalTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'clearcoatNormalTexture',
		this._documentView,
	);

	// KHR_materials_iridescence
	protected readonly iridescenceTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'iridescenceTexture',
		this._documentView,
	);
	protected readonly iridescenceThicknessTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'iridescenceThicknessTexture',
		this._documentView,
	);

	// KHR_materials_sheen
	protected readonly sheenColorTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'sheenColorTexture',
		this._documentView,
	);
	protected readonly sheenRoughnessTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'sheenRoughnessTexture',
		this._documentView,
	);

	// KHR_materials_specular
	protected readonly specularTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'specularTexture',
		this._documentView,
	);
	protected readonly specularColorTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'specularColorTexture',
		this._documentView,
	);

	// KHR_materials_transmission
	protected readonly transmissionTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'transmissionTexture',
		this._documentView,
	);

	// KHR_materials_volume
	protected readonly thicknessTexture = new RefObserver<TextureDef, Texture, TextureParams>(
		'thicknessTexture',
		this._documentView,
	);

	private readonly _textureObservers: RefObserver<TextureDef, Texture, TextureParams>[] = [];
	private readonly _textureUpdateFns: (() => void)[] = [];
	private readonly _textureApplyFns: (() => void)[] = [];

	constructor(documentView: DocumentViewImpl, def: MaterialDef) {
		super(
			documentView,
			def,
			MaterialSubject.createValue(def, documentView.materialPool),
			documentView.materialPool,
		);

		this.extensions.subscribe(() => {
			this.update();
			this.publishAll();
		});

		this.bindTexture(
			['map'],
			this.baseColorTexture,
			() => def.getBaseColorTexture(),
			() => def.getBaseColorTextureInfo(),
			SRGBColorSpace,
		);
		this.bindTexture(
			['emissiveMap'],
			this.emissiveTexture,
			() => def.getEmissiveTexture(),
			() => def.getEmissiveTextureInfo(),
			SRGBColorSpace,
		);
		this.bindTexture(
			['normalMap'],
			this.normalTexture,
			() => def.getNormalTexture(),
			() => def.getNormalTextureInfo(),
			NoColorSpace,
		);
		this.bindTexture(
			['aoMap'],
			this.occlusionTexture,
			() => def.getOcclusionTexture(),
			() => def.getOcclusionTextureInfo(),
			NoColorSpace,
		);
		this.bindTexture(
			['roughnessMap', 'metalnessMap'],
			this.metallicRoughnessTexture,
			() => def.getMetallicRoughnessTexture(),
			() => def.getMetallicRoughnessTextureInfo(),
			NoColorSpace,
		);

		// KHR_materials_anisotropy
		const anisotropyExt = (): Anisotropy | null => def.getExtension<Anisotropy>('KHR_materials_anisotropy');
		this.bindTexture(
			['anisotropyMap'],
			this.anisotropyTexture,
			() => anisotropyExt()?.getAnisotropyTexture() || null,
			() => anisotropyExt()?.getAnisotropyTextureInfo() || null,
			NoColorSpace,
		);

		// KHR_materials_clearcoat
		const clearcoatExt = (): Clearcoat | null => def.getExtension<Clearcoat>('KHR_materials_clearcoat');
		this.bindTexture(
			['clearcoatMap'],
			this.clearcoatTexture,
			() => clearcoatExt()?.getClearcoatTexture() || null,
			() => clearcoatExt()?.getClearcoatTextureInfo() || null,
			NoColorSpace,
		);
		this.bindTexture(
			['clearcoatRoughnessMap'],
			this.clearcoatRoughnessTexture,
			() => clearcoatExt()?.getClearcoatRoughnessTexture() || null,
			() => clearcoatExt()?.getClearcoatRoughnessTextureInfo() || null,
			NoColorSpace,
		);
		this.bindTexture(
			['clearcoatNormalMap'],
			this.clearcoatNormalTexture,
			() => clearcoatExt()?.getClearcoatNormalTexture() || null,
			() => clearcoatExt()?.getClearcoatNormalTextureInfo() || null,
			NoColorSpace,
		);

		// KHR_materials_iridescence
		const iridescenceExt = (): Iridescence | null => def.getExtension<Iridescence>('KHR_materials_iridescence');
		this.bindTexture(
			['iridescenceTexture'],
			this.iridescenceTexture,
			() => iridescenceExt()?.getIridescenceTexture() || null,
			() => iridescenceExt()?.getIridescenceTextureInfo() || null,
			NoColorSpace,
		);
		this.bindTexture(
			['iridescenceThicknessTexture'],
			this.iridescenceThicknessTexture,
			() => iridescenceExt()?.getIridescenceThicknessTexture() || null,
			() => iridescenceExt()?.getIridescenceThicknessTextureInfo() || null,
			NoColorSpace,
		);

		// KHR_materials_sheen
		const sheenExt = (): Sheen | null => def.getExtension<Sheen>('KHR_materials_sheen');
		this.bindTexture(
			['sheenColorMap'],
			this.sheenColorTexture,
			() => sheenExt()?.getSheenColorTexture() || null,
			() => sheenExt()?.getSheenColorTextureInfo() || null,
			SRGBColorSpace,
		);
		this.bindTexture(
			['sheenRoughnessMap'],
			this.sheenRoughnessTexture,
			() => sheenExt()?.getSheenRoughnessTexture() || null,
			() => sheenExt()?.getSheenRoughnessTextureInfo() || null,
			NoColorSpace,
		);

		// KHR_materials_specular
		const specularExt = (): Specular | null => def.getExtension<Specular>('KHR_materials_specular');
		this.bindTexture(
			['specularIntensityMap'],
			this.specularTexture,
			() => specularExt()?.getSpecularTexture() || null,
			() => specularExt()?.getSpecularTextureInfo() || null,
			NoColorSpace,
		);
		this.bindTexture(
			['specularColorMap'],
			this.specularColorTexture,
			() => specularExt()?.getSpecularColorTexture() || null,
			() => specularExt()?.getSpecularColorTextureInfo() || null,
			SRGBColorSpace,
		);

		// KHR_materials_transmission
		const transmissionExt = (): Transmission | null => def.getExtension<Transmission>('KHR_materials_transmission');
		this.bindTexture(
			['transmissionMap'],
			this.transmissionTexture,
			() => transmissionExt()?.getTransmissionTexture() || null,
			() => transmissionExt()?.getTransmissionTextureInfo() || null,
			NoColorSpace,
		);

		// KHR_materials_volume
		const volumeExt = (): Volume | null => def.getExtension<Volume>('KHR_materials_volume');
		this.bindTexture(
			['thicknessMap'],
			this.thicknessTexture,
			() => volumeExt()?.getThicknessTexture() || null,
			() => volumeExt()?.getThicknessTextureInfo() || null,
			NoColorSpace,
		);
	}

	private bindTexture(
		maps: string[],
		observer: RefObserver<TextureDef, Texture, TextureParams>,
		textureFn: () => TextureDef | null,
		textureInfoFn: () => TextureInfoDef | null,
		colorSpace: ColorSpace,
	): Subscription {
		observer.setParamsFn(() => TexturePool.createParams(textureInfoFn()!, colorSpace));

		const applyTextureFn = (texture: Texture | null) => {
			const material = this.value as Material;
			for (const map of maps) {
				if (!(map in material)) continue; // Unlit ⊂ Standard ⊂ Physical (& Points, Lines)
				if (!!material[map] !== !!texture) material.needsUpdate = true; // Recompile on add/remove.
				material[map] = texture;
			}
		};

		this._textureObservers.push(observer);
		this._textureUpdateFns.push(() => observer.update(textureFn()));
		this._textureApplyFns.push(() => applyTextureFn(observer.value));

		return observer.subscribe((texture) => {
			applyTextureFn(texture);
			this.publishAll();
		});
	}

	private static createValue(def: MaterialDef, pool: ValuePool<Material>): Material {
		const shadingModel = getShadingModel(def);
		switch (shadingModel) {
			case ShadingModel.UNLIT:
				return pool.requestBase(new MeshBasicMaterial());
			case ShadingModel.STANDARD:
				return pool.requestBase(new MeshStandardMaterial());
			case ShadingModel.PHYSICAL:
				return pool.requestBase(new MeshPhysicalMaterial());
			default:
				throw new Error('Unsupported shading model.');
		}
	}

	update() {
		const def = this.def;
		let value = this.value;

		this.extensions.update(def.listExtensions());

		const shadingModel = getShadingModel(def);
		if (
			(shadingModel === ShadingModel.UNLIT && value.type !== 'MeshBasicMaterial') ||
			(shadingModel === ShadingModel.STANDARD && value.type !== 'MeshStandardMaterial') ||
			(shadingModel === ShadingModel.PHYSICAL && value.type !== 'MeshPhysicalMaterial')
		) {
			this.pool.releaseBase(this.value);
			this.value = MaterialSubject.createValue(def, this.pool);
			value = this.value;
			for (const fn of this._textureApplyFns) fn();
		}

		switch (shadingModel) {
			case ShadingModel.PHYSICAL:
				this._updatePhysical(value as MeshPhysicalMaterial); // falls through ⬇
			case ShadingModel.STANDARD:
				this._updateStandard(value as MeshStandardMaterial); // falls through ⬇
			default:
				this._updateBasic(value as MeshBasicMaterial);
		}

		for (const fn of this._textureUpdateFns) fn();
	}

	private _updateBasic(target: MeshBasicMaterial) {
		const def = this.def;

		if (def.getName() !== target.name) {
			target.name = def.getName();
		}

		if (def.getDoubleSided() !== (target.side === DoubleSide)) {
			target.side = def.getDoubleSided() ? DoubleSide : FrontSide;
		}

		switch (def.getAlphaMode()) {
			case 'OPAQUE':
				target.transparent = false;
				target.depthWrite = true;
				target.alphaTest = 0;
				break;
			case 'BLEND':
				target.transparent = true;
				target.depthWrite = false;
				target.alphaTest = 0;
				break;
			case 'MASK':
				target.transparent = false;
				target.depthWrite = true;
				target.alphaTest = def.getAlphaCutoff();
				break;
		}

		const alpha = def.getAlpha();
		if (alpha !== target.opacity) {
			target.opacity = alpha;
		}

		const baseColor = def.getBaseColorFactor().slice(0, 3);
		if (!eq(baseColor, target.color.toArray(_vec3))) {
			target.color.fromArray(baseColor);
		}
	}

	private _updateStandard(target: MeshStandardMaterial) {
		const def = this.def;

		const emissive = def.getEmissiveFactor();
		if (!eq(emissive, target.emissive.toArray(_vec3))) {
			target.emissive.fromArray(emissive);
		}

		const roughness = def.getRoughnessFactor();
		if (roughness !== target.roughness) {
			target.roughness = roughness;
		}

		const metalness = def.getMetallicFactor();
		if (metalness !== target.metalness) {
			target.metalness = metalness;
		}

		const occlusionStrength = def.getOcclusionStrength();
		if (occlusionStrength !== target.aoMapIntensity) {
			target.aoMapIntensity = occlusionStrength;
		}

		const normalScale = def.getNormalScale();
		if (normalScale !== target.normalScale.x) {
			target.normalScale.setScalar(normalScale);
		}
	}

	private _updatePhysical(target: MeshPhysicalMaterial) {
		const def = this.def;

		if (!(target instanceof MeshPhysicalMaterial)) {
			return;
		}

		// KHR_materials_anisotropy
		const anisotropy = def.getExtension<Anisotropy>('KHR_materials_anisotropy');
		if (anisotropy) {
			if (anisotropy.getAnisotropyStrength() !== target.anisotropy) {
				if (target.anisotropy === 0) target.needsUpdate = true;
				target.anisotropy = anisotropy.getAnisotropyStrength();
			}
			if (anisotropy.getAnisotropyRotation() !== target.anisotropyRotation) {
				target.anisotropyRotation = anisotropy.getAnisotropyRotation();
			}
		} else {
			target.anisotropy = 0;
		}

		// KHR_materials_clearcoat
		const clearcoat = def.getExtension<Clearcoat>('KHR_materials_clearcoat');
		if (clearcoat) {
			if (clearcoat.getClearcoatFactor() !== target.clearcoat) {
				if (target.clearcoat === 0) target.needsUpdate = true;
				target.clearcoat = clearcoat.getClearcoatFactor();
			}
			if (clearcoat.getClearcoatRoughnessFactor() !== target.clearcoatRoughness) {
				target.clearcoatRoughness = clearcoat.getClearcoatRoughnessFactor();
			}
			if (clearcoat.getClearcoatNormalScale() !== target.clearcoatNormalScale.x) {
				target.clearcoatNormalScale.x = clearcoat.getClearcoatNormalScale();
				target.clearcoatNormalScale.y = -clearcoat.getClearcoatNormalScale();
			}
		} else {
			target.clearcoat = 0;
		}

		// KHR_materials_emissive_strength
		const emissiveStrength = def.getExtension<EmissiveStrength>('KHR_materials_emissive_strength');
		if (emissiveStrength) {
			if (emissiveStrength.getEmissiveStrength() !== target.emissiveIntensity) {
				target.emissiveIntensity = emissiveStrength.getEmissiveStrength();
			}
		} else {
			target.emissiveIntensity = 1.0;
		}

		// KHR_materials_ior
		const ior = def.getExtension<IOR>('KHR_materials_ior');
		if (ior) {
			if (ior.getIOR() !== target.ior) {
				target.ior = ior.getIOR();
			}
		} else {
			target.ior = 1.5;
		}

		// KHR_materials_iridescence
		const iridescence = def.getExtension<Iridescence>('KHR_materials_iridescence');
		if (iridescence) {
			if (iridescence.getIridescenceFactor() !== target.iridescence) {
				target.iridescence = iridescence.getIridescenceFactor();
			}
			const range = [iridescence.getIridescenceThicknessMinimum(), iridescence.getIridescenceThicknessMaximum()];
			if (!eq(range, target.iridescenceThicknessRange)) {
				target.iridescenceThicknessRange[0] = range[0];
				target.iridescenceThicknessRange[1] = range[1];
			}
			if (iridescence.getIridescenceIOR() !== target.iridescenceIOR) {
				target.iridescenceIOR = iridescence.getIridescenceIOR();
			}
		} else {
			target.iridescence = 0;
		}

		// KHR_materials_sheen
		const sheen = def.getExtension<Sheen>('KHR_materials_sheen');
		if (sheen) {
			target.sheen = 1;
			const sheenColor = sheen.getSheenColorFactor();
			if (!eq(sheenColor, target.sheenColor!.toArray(_vec3))) {
				target.sheenColor!.fromArray(sheenColor);
			}
			if (sheen.getSheenRoughnessFactor() !== target.sheenRoughness) {
				target.sheenRoughness = sheen.getSheenRoughnessFactor();
			}
		} else {
			target.sheen = 0;
		}

		// KHR_materials_specular
		const specular = def.getExtension<Specular>('KHR_materials_specular');
		if (specular) {
			if (specular.getSpecularFactor() !== target.specularIntensity) {
				target.specularIntensity = specular.getSpecularFactor();
			}
			const specularColor = specular.getSpecularColorFactor();
			if (!eq(specularColor, target.specularColor.toArray(_vec3))) {
				target.specularColor.fromArray(specularColor);
			}
		} else {
			target.specularIntensity = 1.0;
			target.specularColor.setRGB(1, 1, 1);
		}

		// KHR_materials_transmission
		const transmission = def.getExtension<Transmission>('KHR_materials_transmission');
		if (transmission) {
			if (transmission.getTransmissionFactor() !== target.transmission) {
				if (target.transmission === 0) target.needsUpdate = true;
				target.transmission = transmission.getTransmissionFactor();
			}
		} else {
			target.transmission = 0;
		}

		// KHR_materials_volume
		const volume = def.getExtension<Volume>('KHR_materials_volume');
		if (volume) {
			if (volume.getThicknessFactor() !== target.thickness) {
				if (target.thickness === 0) target.needsUpdate = true;
				target.thickness = volume.getThicknessFactor();
			}
			if (volume.getAttenuationDistance() !== target.attenuationDistance) {
				target.attenuationDistance = volume.getAttenuationDistance();
			}
			const attenuationColor = volume.getAttenuationColor();
			if (!eq(attenuationColor, target.attenuationColor.toArray(_vec3))) {
				target.attenuationColor.fromArray(attenuationColor);
			}
		} else {
			target.thickness = 0;
		}
	}

	dispose() {
		this.extensions.dispose();
		for (const observer of this._textureObservers) {
			observer.dispose();
		}
		super.dispose();
	}
}

function getShadingModel(def: MaterialDef): ShadingModel {
	for (const extension of def.listExtensions()) {
		switch (extension.extensionName) {
			case 'KHR_materials_unlit':
				return ShadingModel.UNLIT;

			case 'KHR_materials_anisotropy':
			case 'KHR_materials_clearcoat':
			case 'KHR_materials_ior':
			case 'KHR_materials_iridescence':
			case 'KHR_materials_sheen':
			case 'KHR_materials_specular':
			case 'KHR_materials_transmission':
			case 'KHR_materials_volume':
				return ShadingModel.PHYSICAL;
		}
	}
	return ShadingModel.STANDARD;
}
