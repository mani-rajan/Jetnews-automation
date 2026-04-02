import { androidCapabilities } from './devices.android';
import { sharedConfig } from './wdio.shared.conf';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const runMultiDevice = process.env.MULTI_DEVICE === 'true';
const strictDiscovery = process.env.REQUIRE_ALL_DEVICES === 'true';

function resolveAdbExecutable(): string {
    const explicit = process.env.ADB_PATH;
    if (explicit && existsSync(explicit)) {
        return explicit;
    }

    const sdkRoot = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME;
    if (sdkRoot) {
        const candidate = join(sdkRoot, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return process.platform === 'win32' ? 'adb.exe' : 'adb';
}

function getConnectedAndroidDevices(): string[] {
    const adb = resolveAdbExecutable();
    try {
        const output = execFileSync(adb, ['devices'], { encoding: 'utf8' });
        return output
            .split(/\r?\n/)
            .slice(1)
            .map((line) => line.trim())
            .filter((line) => line.endsWith('\tdevice'))
            .map((line) => line.split('\t')[0]);
    } catch {
        return [];
    }
}

const connectedDevices = getConnectedAndroidDevices();
const requestedCapabilities = runMultiDevice ? androidCapabilities : [androidCapabilities[0]];
const discoveryAvailable = connectedDevices.length > 0;

const capabilities = discoveryAvailable
    ? requestedCapabilities.filter((capability) => {
          const udid = String(capability['appium:udid'] ?? capability['appium:deviceName'] ?? '');
          return connectedDevices.includes(udid);
      })
    : runMultiDevice
      ? [androidCapabilities[0]]
      : requestedCapabilities;

const finalCapabilities = capabilities.length ? capabilities : [androidCapabilities[0]];
const parallelInstances = Number(process.env.MAX_INSTANCES ?? finalCapabilities.length);

if (discoveryAvailable && finalCapabilities.length < requestedCapabilities.length) {
    const skipped = requestedCapabilities
        .map((capability) => String(capability['appium:udid'] ?? capability['appium:deviceName'] ?? 'unknown'))
        .filter((udid) => !connectedDevices.includes(udid));
    console.warn(`[wdio.android] Skipping disconnected device(s): ${skipped.join(', ')}`);
}

if (!discoveryAvailable && runMultiDevice) {
    const message = '[wdio.android] No connected devices detected from adb discovery. Falling back to primary device only.';
    if (strictDiscovery) {
        throw new Error(`${message} Set REQUIRE_ALL_DEVICES=false to allow fallback.`);
    }
    console.warn(message);
}

export const config: WebdriverIO.Config = {
    ...sharedConfig,
    specs: ['../features/**/*.feature'],
    maxInstances: parallelInstances,
    capabilities: finalCapabilities
};