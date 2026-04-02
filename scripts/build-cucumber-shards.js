const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const featuresRoot = path.join(projectRoot, 'features');

function walkFeatureFiles(rootDir) {
    const files = [];
    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkFeatureFiles(fullPath));
            continue;
        }
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.feature')) {
            files.push(fullPath);
        }
    }
    return files;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectScenarioNames(featureFilePath) {
    const content = fs.readFileSync(featureFilePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const names = [];
    for (const line of lines) {
        const match = line.match(/^\s*Scenario(?: Outline)?:\s*(.+)\s*$/i);
        if (match && match[1]) {
            names.push(match[1].trim());
        }
    }
    return names;
}

const featureFiles = walkFeatureFiles(featuresRoot);
const allScenarios = [];
for (const file of featureFiles) {
    for (const name of collectScenarioNames(file)) {
        allScenarios.push(name);
    }
}

const worker1 = [];
const worker2 = [];
for (let i = 0; i < allScenarios.length; i += 1) {
    if (i % 2 === 0) {
        worker1.push(allScenarios[i]);
    } else {
        worker2.push(allScenarios[i]);
    }
}

const worker1Regex = worker1.length
    ? worker1.map((name) => `^${escapeRegex(name)}$`).join('|')
    : null;
const worker2Regex = worker2.length
    ? worker2.map((name) => `^${escapeRegex(name)}$`).join('|')
    : null;

process.stdout.write(JSON.stringify({
    totalScenarios: allScenarios.length,
    worker1,
    worker2,
    worker1Regex,
    worker2Regex
}));

