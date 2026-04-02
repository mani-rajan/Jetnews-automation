const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const runnerScript = path.join(projectRoot, 'scripts', 'run-android-two-emulators.ps1');
const reportScript = path.join(projectRoot, 'scripts', 'generate-cucumber-report.js');

const powershell = process.env.ComSpec ? 'powershell.exe' : 'powershell';

const runResult = spawnSync(
    powershell,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', runnerScript],
    { cwd: projectRoot, stdio: 'inherit' }
);

const reportResult = spawnSync(process.execPath, [reportScript], {
    cwd: projectRoot,
    stdio: 'inherit'
});

if (reportResult.status !== 0) {
    process.exit(reportResult.status ?? 1);
}

process.exit(runResult.status ?? 1);

