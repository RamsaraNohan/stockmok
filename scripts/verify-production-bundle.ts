import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

interface GovernedPattern {
  readonly label: string;
  readonly expression: RegExp;
}

interface Finding {
  readonly file: string;
  readonly label: string;
  readonly matches: number;
}

const outputDirectory = resolve(process.argv[2] ?? 'dist');
const executableExtensions = new Set(['.cjs', '.html', '.js', '.mjs']);
const governedPatterns: readonly GovernedPattern[] = [
  { label: 'Stockmok loopback host', expression: /127\.0\.0\.1/g },
  { label: 'Auth emulator port', expression: /\b9099\b/g },
  { label: 'Firestore emulator port', expression: /\b8080\b/g },
  { label: 'Functions emulator port', expression: /\b5001\b/g },
];

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

if (!existsSync(outputDirectory)) {
  throw new Error(`Production output directory does not exist: ${outputDirectory}`);
}

const files = listFiles(outputDirectory);
const executableFiles = files.filter((file) => executableExtensions.has(extname(file)));
if (executableFiles.length === 0) {
  throw new Error(`No executable production assets found in: ${outputDirectory}`);
}

const findings: Finding[] = [];
let unrelatedLocalhostLiterals = 0;
let nonEndpoint8080ColorLiterals = 0;
let thirdPartyConnectorNameLiterals = 0;

for (const file of executableFiles) {
  const contents = readFileSync(file, 'utf8');
  const displayPath = relative(process.cwd(), file);

  unrelatedLocalhostLiterals += contents.match(/localhost/gi)?.length ?? 0;
  nonEndpoint8080ColorLiterals += contents.match(/#808080/gi)?.length ?? 0;
  thirdPartyConnectorNameLiterals +=
    contents.match(/connect(?:Auth|Firestore|Functions)Emulator/g)?.length ?? 0;

  for (const pattern of governedPatterns) {
    const matches = contents.match(pattern.expression)?.length ?? 0;
    if (matches > 0) {
      findings.push({ file: displayPath, label: pattern.label, matches });
    }
  }
}

const sourceMapFiles = files.filter((file) => extname(file) === '.map');
let sourceMapEndpointMatches = 0;
for (const file of sourceMapFiles) {
  const contents = readFileSync(file, 'utf8');
  for (const pattern of governedPatterns) {
    sourceMapEndpointMatches += contents.match(pattern.expression)?.length ?? 0;
  }
}

console.log(`PRODUCTION_EXECUTABLE_ASSETS=${String(executableFiles.length)}`);
console.log(`PRODUCTION_SOURCE_MAPS=${String(sourceMapFiles.length)}`);
console.log(`UNRELATED_LOCALHOST_LITERALS=${String(unrelatedLocalhostLiterals)}`);
console.log(`NON_ENDPOINT_8080_COLOR_LITERALS=${String(nonEndpoint8080ColorLiterals)}`);
console.log(`THIRD_PARTY_CONNECTOR_NAME_LITERALS=${String(thirdPartyConnectorNameLiterals)}`);
console.log(`SOURCE_MAP_EMULATOR_ENDPOINT_MATCHES=${String(sourceMapEndpointMatches)}`);

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(
      `PRODUCTION_EMULATOR_ENDPOINT_FINDING=${finding.label}|${finding.file}|${String(finding.matches)}`,
    );
  }
  console.error('PRODUCTION_EMULATOR_ENDPOINTS=FOUND');
  process.exitCode = 1;
} else {
  console.log('PRODUCTION_EMULATOR_ENDPOINTS=NONE');
}
