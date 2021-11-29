/*
	eslint-disable
	@typescript-eslint/no-explicit-any,
	@typescript-eslint/no-empty-function,
	@typescript-eslint/no-unused-vars,
	@typescript-eslint/explicit-module-boundary-types
*/

const DECORATOR_PREFIX = '__';

/**
 * @hidden
 * @category Graph
 */
export function GraphChild(target: any, propertyKey: string): void {
	Object.defineProperty(target, propertyKey, {
		get: function () {
			return this[DECORATOR_PREFIX + propertyKey];
		},
		set: function (value) {
			const link = this[DECORATOR_PREFIX + propertyKey];

			if (link && !Array.isArray(link)) {
				link.dispose();
			}

			if (value && !Array.isArray(value)) {
				// This listener handles dispose events for property Links. The addGraphChild
				// method handles the events for arrays of Links.
				value.onDispose(() => {
					this[DECORATOR_PREFIX + propertyKey] = null;
				});
			}

			this[DECORATOR_PREFIX + propertyKey] = value;
		},
		enumerable: true,
	});
}

/**
 * @hidden
 * @category Graph
 */
export function GraphChildList(target: any, propertyKey: string): void {}
