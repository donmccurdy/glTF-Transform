import { Extension } from '@gltf-transform/core';

class GizmoExtension extends Extension {
	static EXTENSION_NAME = 'ACME_gizmo';
	extensionName = 'ACME_gizmo';
	write(_context) { return this; }
	read(_context) { return this; }
}

export default { extensions: [ GizmoExtension ] };
