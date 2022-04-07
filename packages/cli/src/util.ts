/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn: _spawn } = require('child_process');

import _commandExists from 'command-exists';
import { Document, PropertyType, Texture } from '@gltf-transform/core';
import type { ChildProcess } from 'child_process';

// Constants.

export const XMPContext: Record<string, string> = {
	dc: 'http://purl.org/dc/elements/1.1/',
	model3d: 'https://schema.khronos.org/model3d/xsd/1.0/',
	rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	xmp: 'http://ns.adobe.com/xap/1.0/',
	xmpRights: 'http://ns.adobe.com/xap/1.0/rights/',
};

// Mock for tests.

export let spawn = _spawn;
export let commandExists = _commandExists;
export let waitExit = _waitExit;

export function mockSpawn(_spawn: unknown): void {
	spawn = _spawn;
}

export function mockCommandExists(_commandExists: (n: string) => Promise<boolean>): void {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	commandExists = _commandExists as any;
}

export function mockWaitExit(_waitExit: (process: ChildProcess) => Promise<[unknown, string, string]>): void {
	waitExit = _waitExit;
}

export async function _waitExit(process: ChildProcess): Promise<[unknown, string, string]> {
	let stdout = '';
	if (process.stdout) {
		for await (const chunk of process.stdout) {
			stdout += chunk;
		}
	}
	let stderr = '';
	if (process.stderr) {
		for await (const chunk of process.stderr) {
			stderr += chunk;
		}
	}
	const status = await new Promise((resolve, _) => {
		process.on('close', resolve);
	});
	return [status, stdout, stderr];
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
	if (!value) {
		return '';
	}

	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value.toString();
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
