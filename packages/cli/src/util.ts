// Utilities.

export function formatLong(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatParagraph(str: string): string {
	return str.match(/.{1,80}(\s|$)/g)
		.map((line) => line.trim())
		.join('\n');
}

export function formatHeader(title: string): string {
	return ''
		+ '\n ' + title.toUpperCase()
		+ '\n ────────────────────────────────────────────';
}
