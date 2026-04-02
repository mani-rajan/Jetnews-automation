const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const wdioConfig = path.join(projectRoot, 'config', 'wdio.android.conf.ts');
const reportScript = path.join(projectRoot, 'scripts', 'generate-cucumber-report.js');

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const wdioRun = spawnSync(npxCmd, ['wdio', 'run', wdioConfig], {
    cwd: projectRoot,
    stdio: 'inherit'
});

const reportRun = spawnSync(process.execPath, [reportScript], {
    cwd: projectRoot,
    stdio: 'inherit'
});

if (reportRun.status !== 0) {
    process.exit(reportRun.status ?? 1);
}

process.exit(wdioRun.status ?? 1);

