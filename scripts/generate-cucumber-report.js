const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const report = require('multiple-cucumber-html-reporter');

const projectRoot = path.resolve(__dirname, '..');
const jsonDir = path.join(projectRoot, 'reports', 'cucumber-json');
const htmlDir = path.join(projectRoot, 'reports', 'cucumber-html');

// ─── APK metadata via aapt2 ───────────────────────────────────────────────────

function resolveAapt2() {
    if (process.env.AAPT2_PATH && fs.existsSync(process.env.AAPT2_PATH)) {
        return process.env.AAPT2_PATH;
    }
    const sdkRoot = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME;
    if (!sdkRoot) return null;
    const buildToolsDir = path.join(sdkRoot, 'build-tools');
    if (!fs.existsSync(buildToolsDir)) return null;
    const ext = process.platform === 'win32' ? 'aapt2.exe' : 'aapt2';
    const versions = fs.readdirSync(buildToolsDir).sort().reverse();
    for (const v of versions) {
        const candidate = path.join(buildToolsDir, v, ext);
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

function extractApkInfo(apkPath) {
    const aapt2 = resolveAapt2();
    if (!aapt2 || !fs.existsSync(apkPath)) return { name: null, version: null };
    try {
        const output = execFileSync(aapt2, ['dump', 'badging', apkPath], { encoding: 'utf8' });
        const pkgLine = output.split(/\r?\n/).find((l) => l.startsWith('package:'));
        const versionMatch = pkgLine && pkgLine.match(/versionName='([^']+)'/);
        return { name: 'JetNews', version: versionMatch ? versionMatch[1] : null };
    } catch {
        return { name: null, version: null };
    }
}

const apkPath =
    process.env.APP_PATH_ANDROID ??
    path.join(projectRoot, 'apps', 'jetnews-assessment-debug.apk');

const apkInfo = extractApkInfo(apkPath);

// ─── Resolved metadata (env vars take priority, aapt2 as fallback) ────────────

const metadata = {
    app: {
        name:    process.env.APP_NAME    ?? apkInfo.name    ?? 'JetNews',
        version: process.env.APP_VERSION ?? apkInfo.version ?? 'unknown'
    },
    browser: {
        name:    'Appium',
        version: '3.x'
    },
    device:
        process.env.DEVICE_NAME ??
        process.env.ANDROID_DEVICE_1 ??
        process.env.IOS_DEVICE_1 ??
        'emulator-5554',
    platform: {
        name:
            process.env.PLATFORM_NAME ??
            (process.env.IOS_DEVICE_1 && !process.env.ANDROID_DEVICE_1 ? 'iOS' : 'Android'),
        version:
            process.env.PLATFORM_VERSION ??
            process.env.ANDROID_PLATFORM_VERSION_1 ??
            process.env.IOS_PLATFORM_VERSION_1 ??
            '11'
    }
};

// ─── Guard: JSON folder + files ───────────────────────────────────────────────

if (!fs.existsSync(jsonDir)) {
    console.error(`[cucumber-report] JSON folder not found: ${jsonDir}`);
    console.error('[cucumber-report] Run tests first (sequential or parallel), then run npm run report:cucumber.');
    process.exit(1);
}

const jsonFiles = fs
    .readdirSync(jsonDir)
    .filter((file) => file.toLowerCase().endsWith('.json'));

if (!jsonFiles.length) {
    console.error(`[cucumber-report] No JSON files found in: ${jsonDir}`);
    console.error('[cucumber-report] Ensure the WDIO run produced cucumber JSON output.');
    process.exit(1);
}

fs.mkdirSync(htmlDir, { recursive: true });

// ─── Patch metadata in every feature object ───────────────────────────────────
// Strategy: preserve any value already embedded by wdio-cucumberjs-json-reporter
// (e.g. per-device info from a two-emulator run).  Only replace the well-known
// "not known" / "No metadata.*" placeholder strings that the reporter writes
// when it has no configured value.

const PLACEHOLDER = /not known|No metadata\./i;

function pick(existing, fallback) {
    return (existing && !PLACEHOLDER.test(String(existing))) ? existing : fallback;
}

let totalFeatures = 0;
const devicesSeen = new Set();

for (const file of jsonFiles) {
    const filePath = path.join(jsonDir, file);
    const features = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const feature of features) {
        const m = feature.metadata || {};
        feature.metadata = {
            app: {
                name:    pick(m.app?.name,        metadata.app.name),
                version: pick(m.app?.version,     metadata.app.version)
            },
            browser: {
                name:    pick(m.browser?.name,    metadata.browser.name),
                version: pick(m.browser?.version, metadata.browser.version)
            },
            device:  pick(m.device,               metadata.device),
            platform: {
                name:    pick(m.platform?.name,   metadata.platform.name),
                version: pick(m.platform?.version, metadata.platform.version)
            }
        };
        devicesSeen.add(feature.metadata.device);
    }
    fs.writeFileSync(filePath, JSON.stringify(features));
    totalFeatures += features.length;
}
console.log(
    `[cucumber-report] Metadata applied to ${totalFeatures} feature(s) in ${jsonFiles.length} file(s).` +
    `\n  App:     ${metadata.app.name} v${metadata.app.version}` +
    `\n  Devices: ${[...devicesSeen].join(', ')}` +
    `\n  Platform: ${metadata.platform.name} ${metadata.platform.version}`
);

// ─── Generate HTML report ─────────────────────────────────────────────────────

report.generate({
    jsonDir,
    reportPath: htmlDir,
    pageTitle:   'JetNews Cucumber Report',
    reportName:  'JetNews WDIO BDD Execution',
    displayDuration: true,
    customData: {
        title: 'Execution Info',
        data: [
            { label: 'Generated At', value: new Date().toISOString() },
            { label: 'App',          value: `${metadata.app.name} v${metadata.app.version}` },
            { label: 'Device(s)',    value: [...devicesSeen].join(' | ') },
            { label: 'OS',           value: `${metadata.platform.name} ${metadata.platform.version}` },
            { label: 'Appium',       value: metadata.browser.version },
            { label: 'JSON Source',  value: jsonDir }
        ]
    }
});

console.log(`[cucumber-report] HTML report generated at: ${htmlDir}`);
