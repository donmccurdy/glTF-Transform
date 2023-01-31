import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

export default {
	extensions: ALL_EXTENSIONS,
	onProgramReady: ({ program, io, Session }) => {
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

/** Custom transform example; clears materials. */
function customTransform(options) {
	return async (document) => {
		for (const material of document.getRoot().listMaterials()) {
			material.dispose();
		}
	};
}
