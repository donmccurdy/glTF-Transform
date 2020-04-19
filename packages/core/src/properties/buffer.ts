import { Property } from './property';

/**
 * @category Properties
 */
export class Buffer extends Property {
	private uri: string;
	public getURI(): string {
		return this.uri;
	}
	public setURI(uri: string): Buffer {
		this.uri = uri;
		return this;
	}
}
