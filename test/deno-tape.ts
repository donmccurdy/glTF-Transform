
import { assert, assertEquals, assertNotEquals, assertStrictEquals, assertNotStrictEquals, assertMatch, assertThrows } from "https://deno.land/std@0.85.0/testing/asserts.ts";

class TestInstance {
	ok = assert;
	equal = assertStrictEquals;
	equals = assertStrictEquals;
	notEqual = assertNotStrictEquals;
	notEquals = assertNotStrictEquals;
	deepEqual = assertEquals;
	deepEquals = assertEquals;
	notDeepEqual = assertNotEquals;
	notDeepEquals = assertNotEquals;
	match = assertMatch;
	throws = assertThrows;
	fail(msg: string) {
		throw new Error(msg);
	}
	end() {};
}

interface TestOptions {
	skip?: boolean;
}

type TestCallback = (t: any) => any;

function test(name: string, fn: TestCallback): void;
function test(name: string, opts: TestOptions, fn: TestCallback): void;
function test(name: string, fnOrOpts: TestOptions | TestCallback, fn?: TestCallback): void {
	const t  = new TestInstance();
	if (typeof fnOrOpts === 'function') {
		Deno.test(name, fnOrOpts.bind(t, t));
	} else if (!fnOrOpts.skip) {
		Deno.test(name, (fn as TestCallback).bind(t, t));
	}
}

export default test;
