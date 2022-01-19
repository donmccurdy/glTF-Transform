/* eslint-disable @typescript-eslint/no-var-requires */
const { spawnSync: _spawnSync } = require('child_process');

import { sync as _commandExistsSync } from 'command-exists';
import { Document, PropertyType, Texture } from '@gltf-transform/core';

// Mock for tests.

export let spawnSync = _spawnSync;
export let commandExistsSync = _commandExistsSync;

export function mockSpawnSync(_spawnSync: unknown): void {
	spawnSync = _spawnSync;
}

export function mockCommandExistsSync(_commandExistsSync: (n: string) => boolean): void {
	commandExistsSync = _commandExistsSync;
}

// Formatting.

export function formatLong(x: number): string {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1000;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatParagraph(str: string): string {
	return str
		.match(/.{1,80}(\s|$)/g)!
		.map((line) => line.trim())
		.join('\n');
}

export function formatHeader(title: string): string {
	return '' + '\n ' + title.toUpperCase() + '\n ────────────────────────────────────────────';
}

export function formatXMP(value: string | number | boolean | Record<string, unknown> | null): string {
	if (!value || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value + '';
	}

	if (value['@list']) {
		const list = value['@list'] as string[];
		const hasCommas = list.some((value) => value.indexOf(',') > 0);
		return list.join(hasCommas ? '; ' : ', ');
	}

	if (value['@type'] === 'rdf:Alt') {
		return (value['rdf:_1'] as Record<string, string>)['@value'];
	}

	return JSON.stringify(value);
}

// Textures.

/** Returns names of all texture slots using the given texture. */
export function getTextureSlots(doc: Document, texture: Texture): string[] {
	const root = doc.getRoot();
	const slots = doc
		.getGraph()
		.listParentEdges(texture)
		.filter((edge) => edge.getParent() !== root)
		.map((edge) => edge.getName());
	return Array.from(new Set(slots));
}

/** Returns bit mask of all texture channels used by the given texture. */
export function getTextureChannels(doc: Document, texture: Texture): number {
	let mask = 0x0000;
	for (const edge of doc.getGraph().listParentEdges(texture)) {
		const { channels } = edge.getAttributes() as { channels: number | undefined };

		if (channels) {
			mask |= channels;
			continue;
		}

		if (edge.getParent().propertyType !== PropertyType.ROOT) {
			doc.getLogger().warn(`Missing attribute ".channels" on edge, "${edge.getName()}".`);
		}
	}
	return mask;
}
