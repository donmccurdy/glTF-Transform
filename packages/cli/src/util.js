// Utilities.

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatParagraph(str) {
	return str.match(/.{1,80}(\s|$)/g).join('\n');
}

function formatHeader(title) {
	return ''
		+ '\n ' + title.toUpperCase()
		+ '\n ────────────────────────────────────────────';
}

module.exports = {formatBytes, formatHeader, formatParagraph};
