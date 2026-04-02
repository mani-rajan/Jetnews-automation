import { iosCapabilities } from './devices.ios';
import { sharedConfig } from './wdio.shared.conf';

const runMultiDevice = process.env.MULTI_DEVICE === 'true';
const parallelInstances = Number(process.env.MAX_INSTANCES ?? (runMultiDevice ? 2 : 1));

export const config: WebdriverIO.Config = {
    ...sharedConfig,
    specs: ['../features/**/*.feature'],
    maxInstances: parallelInstances,
    capabilities: runMultiDevice ? iosCapabilities : [iosCapabilities[0]]
};
