import { Element } from './element';

export class Buffer extends Element {
	private uri: string;
	public getURI(): string {
		return this.uri;
	}
	public setURI(uri: string): Buffer {
		this.uri = uri;
		return this;
	}
}
