---
title: Command-line configuration | glTF Transform
snippet: Configuration installs custom commands or extensions in the CLI. Extensions will be available to any commands executed…
---

# Command-line configuration

> _**EXPERIMENTAL:** Support for command-line configuration is experimental, and may have
> breaking changes in non-major releases. Please provide feedback on GitHub if this feature
> could be helpful to you._

Configuration installs custom commands or extensions in the CLI. Extensions will be
available to any commands executed by the CLI, allowing operations on glTF files that would
otherwise be unsupported — unofficial compression, texture formats, materials, and other features.
Extensions must be implemented using the [Extension](/extensions) API.

Usage:

```text
gltf-transform --help --config path/to/gltf-transform.config.mjs
```

Example configuration:

```javascript
// gltf-transform.config.mjs
import { Extension } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

// NOTE: The minimal implementation below does not read or write any data
// associated with the extension. See the Extension documentation and
// official implementations in the @gltf-transform/extensions package
// for full usage.
class GizmoExtension extends Extension {
 static EXTENSION_NAME = 'ACME_gizmo';
 extensionName = 'ACME_gizmo';
 write(context) { return this; }
 read(context) { return this; }
}

export default {
 extensions: [...ALL_EXTENSIONS, GizmoExtension],
 onProgramReady: ({ program, io, Session }) => {
     // Usage: https://caporal.io/
     program
         .command('custom', 'Custom command')
         .help('Lorem ipsum dolorem...')
         .argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) model')
         .argument('<output>', 'Path to write output')
         .action(({ args, options, logger }) =>
         	Session.create(io, logger, args.input, args.output).transform(customTransform(options))
         );
 },
};

// Custom transform example; clears materials.
function customTransform(options) {
 return async (document) => {
     for (const material of document.getRoot().listMaterials()) {
         material.dispose();
     }
 };
}
```

Writing extensions in TypeScript is strongly encouraged. However, `gltf-transform.config.mjs` must be
written in, or compiled to, plain JavaScript.
