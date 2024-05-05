import { Document, Material, Texture } from '@gltf-transform/core';
import { KHRMaterialsClearcoat, KHRMaterialsIOR, KHRMaterialsSheen, KHRMaterialsSpecular, KHRMaterialsTransmission, KHRMaterialsUnlit, KHRMaterialsVolume } from '@gltf-transform/extensions';
import { FolderApi, Pane } from 'tweakpane';
import * as TweakpanePluginThumbnailList from 'tweakpane-plugin-thumbnail-list';

interface TextureOption {value: string, src: string, data: Texture}

const textureFromEvent = (event): Texture | null => {
	const value = event.value as unknown as TextureOption | null;
	return value ? value.data : null;
};

const textureValue = (texture: Texture | null, options: TextureOption[]): string => {
	if (!texture) return '';
	const option = options.find((option) => option.data === texture)!;
	return option.value;
};

export function createMaterialPane(_pane: Pane, document: Document, material: Material): FolderApi {
	_pane.registerPlugin(TweakpanePluginThumbnailList);
	const pane = _pane.addFolder({title: 'Material'});

	const clearcoatExtension = document.createExtension(KHRMaterialsClearcoat);
	const clearcoat = clearcoatExtension.createClearcoat();
	const iorExtension = document.createExtension(KHRMaterialsIOR);
	const ior = iorExtension.createIOR();
	const sheenExtension = document.createExtension(KHRMaterialsSheen);
	const sheen = sheenExtension.createSheen();
	const specularExtension = document.createExtension(KHRMaterialsSpecular);
	const specular = specularExtension.createSpecular();
	const transmissionExtension = document.createExtension(KHRMaterialsTransmission);
	const transmission = transmissionExtension.createTransmission();
	const volumeExtension = document.createExtension(KHRMaterialsVolume);
	const volume = volumeExtension.createVolume();
	const unlitExtension = document.createExtension(KHRMaterialsUnlit);
	const unlit = unlitExtension.createUnlit();

	const textureOptions = document.getRoot().listTextures().map((texture, index) => {
		return {
			text: texture.getName() || texture.getURI() || index.toString(),
			value: index.toString(),
			src: URL.createObjectURL(new Blob([texture.getImage()!], {type: texture.getMimeType()})),
			data: texture,
		};
	});

	const params = {
		// Core.
		baseColorFactor: material.getBaseColorHex(),
		baseColorTexture: textureValue(material.getBaseColorTexture(), textureOptions),
		alpha: material.getAlpha(),
		alphaMode: material.getAlphaMode(),
		emissiveFactor: material.getEmissiveHex(),
		emissiveTexture: textureValue(material.getEmissiveTexture(), textureOptions),
		roughnessFactor: material.getRoughnessFactor(),
		metallicFactor: material.getMetallicFactor(),
		metallicRoughnessTexture: textureValue(material.getMetallicRoughnessTexture(), textureOptions),
		occlusionStrength: material.getOcclusionStrength(),
		occlusionTexture: textureValue(material.getOcclusionTexture(), textureOptions),
		normalScale: material.getNormalScale(),
		normalTexture: textureValue(material.getNormalTexture(), textureOptions),

		// Clearcoat.
		clearcoatEnabled: !!material.getExtension('KHR_materials_clearcoat'),
		clearcoatFactor: clearcoat.getClearcoatFactor(),
		clearcoatTexture: textureValue(clearcoat.getClearcoatTexture(), textureOptions),
		clearcoatRoughnessFactor: clearcoat.getClearcoatRoughnessFactor(),
		clearcoatRoughnessTexture: textureValue(clearcoat.getClearcoatRoughnessTexture(), textureOptions),
		clearcoatNormalScale: clearcoat.getClearcoatNormalScale(),
		clearcoatNormalTexture: textureValue(clearcoat.getClearcoatNormalTexture(), textureOptions),

		// IOR.
		iorEnabled: !!material.getExtension('KHR_materials_ior'),
		ior: ior.getIOR(),

		// Sheen.
		sheenEnabled: !!material.getExtension('KHR_materials_sheen'),
		sheenColorFactor: sheen.getSheenColorHex(),
		sheenColorTexture: textureValue(sheen.getSheenColorTexture(), textureOptions),
		sheenRoughnessFactor: sheen.getSheenRoughnessFactor(),
		sheenRoughnessTexture: textureValue(sheen.getSheenRoughnessTexture(), textureOptions),

		// Specular.
		specularEnabled: !!material.getExtension('KHR_materials_specular'),
		specularFactor: specular.getSpecularFactor(),
		specularTexture: textureValue(specular.getSpecularTexture(), textureOptions),
		specularColorFactor: specular.getSpecularColorHex(),
		specularColorTexture: textureValue(specular.getSpecularColorTexture(), textureOptions),

		// Transmission.
		transmissionEnabled: !!material.getExtension('KHR_materials_transmission'),
		transmissionFactor: transmission.getTransmissionFactor(),
		transmissionTexture: textureValue(transmission.getTransmissionTexture(), textureOptions),

		// Volume.
		volumeEnabled: !!material.getExtension('KHR_materials_volume'),
		thicknessFactor: volume.getThicknessFactor(),
		thicknessTexture: textureValue(volume.getThicknessTexture(), textureOptions),
		attenuationColorFactor: volume.getAttenuationColorHex(),
		attenuationDistance: Number.isFinite(volume.getAttenuationDistance())
			? volume.getAttenuationDistance()
			: 0,

		// Unlit.
		unlitEnabled: !!material.getExtension('KHR_materials_unlit'),
	};

	const coreFolder = pane.addFolder({title: 'Basic'});
	coreFolder.addInput(params, 'baseColorFactor', {view: 'color'})
		.on('change', () => material.setBaseColorHex(params.baseColorFactor));
	coreFolder.addInput(params, 'baseColorTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => material.setBaseColorTexture(textureFromEvent(ev)));
	coreFolder.addSeparator();
	coreFolder.addInput(params, 'alpha', {min: 0, max: 1})
		.on('change', () => material.setAlpha(params.alpha));
	coreFolder.addInput(params, 'alphaMode', {options: {OPAQUE: 'OPAQUE', BLEND: 'BLEND', MASK: 'MASK'}})
		.on('change', () => material.setAlphaMode(params.alphaMode));
	coreFolder.addSeparator();
	coreFolder.addInput(params, 'emissiveFactor', {view: 'color'})
		.on('change', () => material.setEmissiveHex(params.emissiveFactor));
	coreFolder.addInput(params, 'emissiveTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => material.setEmissiveTexture(textureFromEvent(ev)));
	coreFolder.addSeparator();
	coreFolder.addInput(params, 'metallicFactor', {min: 0, max: 1})
		.on('change', () => material.setMetallicFactor(params.metallicFactor));
	coreFolder.addInput(params, 'roughnessFactor', {min: 0, max: 1})
		.on('change', () => material.setRoughnessFactor(params.roughnessFactor));
	coreFolder.addInput(params, 'metallicRoughnessTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => material.setMetallicRoughnessTexture(textureFromEvent(ev)));
	coreFolder.addSeparator();
	coreFolder.addInput(params, 'occlusionStrength', {min: 0, max: 1})
		.on('change', () => material.setOcclusionStrength(params.occlusionStrength));
	coreFolder.addInput(params, 'occlusionTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => material.setOcclusionTexture(textureFromEvent(ev)));
	coreFolder.addSeparator();
	coreFolder.addInput(params, 'normalScale')
		.on('change', () => material.setNormalScale(params.normalScale));
	coreFolder.addInput(params, 'normalTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => material.setNormalTexture(textureFromEvent(ev)));

	const clearcoatFolder = pane.addFolder({title: 'KHR_materials_clearcoat', expanded: false});
	clearcoatFolder.addInput(params, 'clearcoatEnabled');
	clearcoatFolder.addSeparator();
	clearcoatFolder.addInput(params, 'clearcoatFactor', {min: 0, max: 1});
	clearcoatFolder.addInput(params, 'clearcoatTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => clearcoat.setClearcoatTexture(textureFromEvent(ev)));
	clearcoatFolder.addSeparator();
	clearcoatFolder.addInput(params, 'clearcoatRoughnessFactor', {min: 0, max: 1});
	clearcoatFolder.addInput(params, 'clearcoatRoughnessTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => clearcoat.setClearcoatRoughnessTexture(textureFromEvent(ev)));
	clearcoatFolder.addSeparator();
	clearcoatFolder.addInput(params, 'clearcoatNormalScale');
	clearcoatFolder.addInput(params, 'clearcoatNormalTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => clearcoat.setClearcoatNormalTexture(textureFromEvent(ev)));
	clearcoatFolder.on('change', () => {
		material.setExtension('KHR_materials_clearcoat', params.clearcoatEnabled ? clearcoat : null);
		clearcoat
			.setClearcoatFactor(params.clearcoatFactor)
			.setClearcoatRoughnessFactor(params.clearcoatRoughnessFactor)
			.setClearcoatNormalScale(params.clearcoatNormalScale);
	});

	const iorFolder = pane.addFolder({title: 'KHR_materials_ior', expanded: false});
	iorFolder.addInput(params, 'iorEnabled');
	iorFolder.addInput(params, 'ior', {min: 1, max: 2});
	iorFolder.on('change', () => {
		material.setExtension('KHR_materials_ior', params.iorEnabled ? ior : null);
		ior.setIOR(params.ior);
	});

	const sheenFolder = pane.addFolder({title: 'KHR_materials_sheen', expanded: false});
	sheenFolder.addInput(params, 'sheenEnabled');
	sheenFolder.addSeparator();
	sheenFolder.addInput(params, 'sheenColorFactor', {view: 'color'});
	sheenFolder.addInput(params, 'sheenColorTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => sheen.setSheenColorTexture(textureFromEvent(ev)));
	sheenFolder.addSeparator();
	sheenFolder.addInput(params, 'sheenRoughnessFactor', {min: 0, max: 1});
	sheenFolder.addInput(params, 'sheenRoughnessTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => sheen.setSheenRoughnessTexture(textureFromEvent(ev)));
	sheenFolder.on('change', () => {
		material.setExtension('KHR_materials_sheen', params.sheenEnabled ? sheen : null);
		sheen
			.setSheenColorHex(params.sheenColorFactor)
			.setSheenRoughnessFactor(params.sheenRoughnessFactor);
	});

	const specularFolder = pane.addFolder({title: 'KHR_materials_specular', expanded: false});
	specularFolder.addInput(params, 'specularEnabled');
	specularFolder.addSeparator();
	specularFolder.addInput(params, 'specularFactor', {min: 0, max: 1});
	specularFolder.addInput(params, 'specularTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => specular.setSpecularTexture(textureFromEvent(ev)));
	specularFolder.addSeparator();
	specularFolder.addInput(params, 'specularColorFactor', {view: 'color'});
	specularFolder.addInput(params, 'specularColorTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => specular.setSpecularColorTexture(textureFromEvent(ev)));
	specularFolder.on('change', () => {
		material.setExtension('KHR_materials_specular', params.specularEnabled ? specular : null);
		specular
			.setSpecularFactor(params.specularFactor)
			.setSpecularColorHex(params.specularColorFactor);
	});

	const transmissionFolder = pane.addFolder({title: 'KHR_materials_transmission', expanded: false});
	transmissionFolder.addInput(params, 'transmissionEnabled');
	transmissionFolder.addSeparator();
	transmissionFolder.addInput(params, 'transmissionFactor', {min: 0, max: 1});
	transmissionFolder.addInput(params, 'transmissionTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => transmission.setTransmissionTexture(textureFromEvent(ev)));
	transmissionFolder.on('change', () => {
		material.setExtension('KHR_materials_transmission', params.transmissionEnabled ? transmission : null);
		transmission.setTransmissionFactor(params.transmissionFactor);
	});

	const volumeFolder = pane.addFolder({title: 'KHR_materials_volume', expanded: false});
	volumeFolder.addInput(params, 'volumeEnabled');
	volumeFolder.addSeparator();
	volumeFolder.addInput(params, 'thicknessFactor', {min: 0, max: 1});
	volumeFolder.addInput(params, 'thicknessTexture', {view: 'thumbnail-list', options: textureOptions})
		.on('change', (ev) => volume.setThicknessTexture(textureFromEvent(ev)));
	volumeFolder.addSeparator();
	volumeFolder.addInput(params, 'attenuationColorFactor', {view: 'color'});
	volumeFolder.addInput(params, 'attenuationDistance', {min: 0, max: 5, step: 0.01});
	volumeFolder.on('change', () => {
		material.setExtension('KHR_materials_volume', params.volumeEnabled ? volume : null);
		volume
			.setThicknessFactor(params.thicknessFactor)
			.setAttenuationColorHex(params.attenuationColorFactor)
			.setAttenuationDistance(params.attenuationDistance);
	});

	const unlitFolder = pane.addFolder({title: 'KHR_materials_unlit', expanded: false});
	unlitFolder.addInput(params, 'unlitEnabled');
	unlitFolder.on('change', () => {
		material.setExtension('KHR_materials_unlit', params.unlitEnabled ? unlit : null);
	});

	return pane;
}
