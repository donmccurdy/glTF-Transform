import { execSync } from 'child_process';
import semver from 'semver';

const version = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();

if (!semver.valid(version)) {
	console.error(`🚨 Invalid version, "${version}".`);
	process.exit(1); // 'general error'
} else if (semver.prerelease(version) !== null) {
	console.warn(`⚠️  Not a stable release.`);
	process.exit(126); // 'cannot execute'
} else {
	process.exit(0); // 'ok'
}
