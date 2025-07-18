import type { WebGLRenderer } from 'three';
import type { Pane } from 'tweakpane';

export function createStatsPane(renderer: WebGLRenderer, pane: Pane) {
	const stats = { info: '' };
	const monitorFolder = pane.addFolder({ index: 0, title: 'Monitor' });
	monitorFolder.addMonitor(stats, 'info', { bufferSize: 1, multiline: true, lineCount: 3 });

	return () => {
		const info = renderer.info;
		stats.info = `
programs     ${info.programs?.length || 0}
geometries   ${info.memory.geometries}
textures     ${info.memory.textures}
        `.trim();
	};
}
