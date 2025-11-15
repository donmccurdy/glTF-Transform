import { gzip as _gzip } from 'node:zlib';

export async function gzip(src: Buffer): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		_gzip(src, (err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}
