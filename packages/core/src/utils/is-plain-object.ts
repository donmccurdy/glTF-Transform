/* eslint-disable @typescript-eslint/no-explicit-any */
// Reference: https://github.com/jonschlinkert/is-plain-object

function isObject(o: any) {
	return Object.prototype.toString.call(o) === '[object Object]';
}

export function isPlainObject(o: any) {
	if (isObject(o) === false) return false;

	// If has modified constructor
	const ctor = o.constructor;
	if (ctor === undefined) return true;

	// If has modified prototype
	const prot = ctor.prototype;
	if (isObject(prot) === false) return false;

	// If constructor does not have an Object-specific method
	if (Object.prototype.hasOwnProperty.call(prot, 'isPrototypeOf') === false) {
		return false;
	}

	// Most likely a plain Object
	return true;
}
