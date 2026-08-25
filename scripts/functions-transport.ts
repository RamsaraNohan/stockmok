import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { EXPECTED_FUNCTION_EXPORT_NAMES } from './functions-package-lib.js';

export const PRODUCTION_PROJECT = 'stockmok';
export const PRODUCTION_REGION = 'asia-southeast1';
export const PRODUCTION_ORIGIN = 'https://stockmok.web.app';
export const EXPECTED_RUNTIME = 'nodejs22';
export const RUN_INVOKER_ROLE = 'roles/run.invoker';
export const PUBLIC_PRINCIPAL = 'allUsers';

export type TransportMode = 'offline' | 'probe' | 'apply';

export interface TransportArguments {
  readonly mode: TransportMode;
  readonly project: string;
  readonly region: string;
  readonly origin: string;
  readonly apply: boolean;
  readonly confirmProject: string;
}

export interface IamCondition {
  readonly expression?: string;
  readonly title?: string;
  readonly description?: string;
  readonly [key: string]: unknown;
}

export interface IamBinding {
  readonly role: string;
  readonly members?: readonly string[];
  readonly condition?: IamCondition | null;
  readonly [key: string]: unknown;
}

export interface IamPolicy {
  readonly bindings?: readonly IamBinding[];
  readonly etag?: string;
  readonly version?: number;
  readonly [key: string]: unknown;
}

export interface PolicyMergeResult {
  readonly policy: IamPolicy;
  readonly changed: boolean;
}

export interface RemoteFunction {
  readonly name: string;
  readonly state?: string;
  readonly buildConfig?: { readonly runtime?: string };
  readonly serviceConfig?: {
    readonly service?: string;
    readonly ingressSettings?: string;
    readonly uri?: string;
  };
}

export interface RemoteInventory {
  readonly functions: readonly RemoteFunction[];
  readonly unreachable?: readonly string[];
}

interface FirebaseAccount {
  readonly user: { readonly email: string };
  readonly tokens: unknown;
}

interface FirebaseAuthModule {
  getProjectDefaultAccount(cwd: string): FirebaseAccount | undefined;
}

interface FirebaseRequireAuthModule {
  requireAuth(options: {
    readonly project: string;
    readonly user: FirebaseAccount['user'];
    readonly tokens: unknown;
  }): Promise<string | null>;
}

interface CloudFunctionsV2Module {
  listAllFunctions(project: string): Promise<RemoteInventory>;
}

interface CloudRunService {
  readonly metadata?: {
    readonly annotations?: Readonly<Record<string, string>>;
  };
}

interface CloudRunModule {
  getIamPolicy(serviceName: string): Promise<IamPolicy>;
  setIamPolicy(serviceName: string, policy: IamPolicy): Promise<void>;
  getService(serviceName: string): Promise<CloudRunService>;
}

interface RemoteFunctionRecord {
  readonly id: string;
  readonly serviceName: string;
  readonly endpoint: string;
  readonly source: RemoteFunction;
}

interface PolicyObservation {
  readonly functionRecord: RemoteFunctionRecord;
  readonly policy: IamPolicy;
  readonly protectedFingerprint: string;
  readonly publicInvoker: boolean;
  readonly unconditionalInvokerMembers: readonly string[];
}

interface PreflightObservation {
  readonly id: string;
  readonly status: number;
  readonly allowOrigin: string;
  readonly allowMethods: string;
  readonly allowHeaders: string;
}

interface RemoteObservation {
  readonly functions: readonly RemoteFunctionRecord[];
  readonly policies: readonly PolicyObservation[];
  readonly preflights: readonly PreflightObservation[];
  readonly invokerIamDisabled: number;
}

interface HandlerObservation {
  readonly status: number;
  readonly callableStatus: string;
  readonly handlerReached: boolean;
}

function argumentValue(argv: readonly string[], index: number, name: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

export function parseTransportArguments(argv: readonly string[]): TransportArguments {
  let mode: TransportMode = 'offline';
  let project = '';
  let region = '';
  let origin = '';
  let apply = false;
  let confirmProject = '';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') {
      apply = true;
      continue;
    }
    if (argument === '--mode') {
      const value = argumentValue(argv, index, '--mode');
      if (value !== 'offline' && value !== 'probe' && value !== 'apply') {
        throw new Error(`Unsupported transport mode: ${value}`);
      }
      mode = value;
      index += 1;
      continue;
    }
    if (argument === '--project') {
      project = argumentValue(argv, index, '--project');
      index += 1;
      continue;
    }
    if (argument === '--region') {
      region = argumentValue(argv, index, '--region');
      index += 1;
      continue;
    }
    if (argument === '--origin') {
      origin = argumentValue(argv, index, '--origin');
      index += 1;
      continue;
    }
    if (argument === '--confirm-project') {
      confirmProject = argumentValue(argv, index, '--confirm-project');
      index += 1;
      continue;
    }
    throw new Error(`Unknown transport argument: ${String(argument)}`);
  }

  return { mode, project, region, origin, apply, confirmProject };
}

export function assertProductionTarget(arguments_: TransportArguments): void {
  if (arguments_.project !== PRODUCTION_PROJECT) {
    throw new Error(`Project must be exactly ${PRODUCTION_PROJECT}.`);
  }
  if (arguments_.region !== PRODUCTION_REGION) {
    throw new Error(`Region must be exactly ${PRODUCTION_REGION}.`);
  }
  if (arguments_.origin !== PRODUCTION_ORIGIN) {
    throw new Error(`Origin must be exactly ${PRODUCTION_ORIGIN}.`);
  }
}

export function assertApplyAuthorized(arguments_: TransportArguments): void {
  assertProductionTarget(arguments_);
  if (arguments_.mode !== 'apply' || !arguments_.apply) {
    throw new Error('IAM mutation is disabled without --mode apply and --apply.');
  }
  if (arguments_.confirmProject !== PRODUCTION_PROJECT) {
    throw new Error(`IAM mutation requires --confirm-project ${PRODUCTION_PROJECT}.`);
  }
}

function isUnconditional(binding: IamBinding): boolean {
  return binding.condition === undefined || binding.condition === null;
}

export function mergePublicInvoker(policy: IamPolicy): PolicyMergeResult {
  const bindings = (policy.bindings ?? []).map((binding) => ({
    ...binding,
    members: [...(binding.members ?? [])],
  }));
  const index = bindings.findIndex(
    (binding) => binding.role === RUN_INVOKER_ROLE && isUnconditional(binding),
  );

  if (index >= 0) {
    const binding = bindings[index];
    if (binding === undefined) throw new Error('Invoker binding index drifted.');
    if (binding.members.includes(PUBLIC_PRINCIPAL)) return { policy, changed: false };
    bindings[index] = {
      ...binding,
      members: [...binding.members, PUBLIC_PRINCIPAL],
    };
  } else {
    bindings.push({ role: RUN_INVOKER_ROLE, members: [PUBLIC_PRINCIPAL] });
  }

  return { policy: { ...policy, bindings }, changed: true };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function protectedPolicyFingerprint(policy: IamPolicy): string {
  const protectedPolicy = {
    ...policy,
    etag: undefined,
    bindings: (policy.bindings ?? []).flatMap((binding) => {
      if (binding.role !== RUN_INVOKER_ROLE || !isUnconditional(binding)) return [binding];
      const members = (binding.members ?? []).filter((member) => member !== PUBLIC_PRINCIPAL);
      return members.length > 0 ? [{ ...binding, members }] : [];
    }),
  };
  return createHash('sha256')
    .update(JSON.stringify(stableValue(protectedPolicy)))
    .digest('hex');
}

function functionId(name: string): string {
  const id = name.split('/').at(-1);
  if (!id) throw new Error(`Invalid Function resource name: ${name}`);
  return id;
}

function functionRegion(name: string): string {
  const parts = name.split('/');
  const locationIndex = parts.indexOf('locations');
  const region = locationIndex >= 0 ? parts[locationIndex + 1] : undefined;
  if (!region) throw new Error(`Function region is missing: ${name}`);
  return region;
}

function functionProject(name: string): string {
  const parts = name.split('/');
  const projectIndex = parts.indexOf('projects');
  const project = projectIndex >= 0 ? parts[projectIndex + 1] : undefined;
  if (!project) throw new Error(`Function project is missing: ${name}`);
  return project;
}

export function validateRemoteInventory(
  inventory: RemoteInventory,
  project: string,
  region: string,
): readonly RemoteFunctionRecord[] {
  if ((inventory.unreachable ?? []).length > 0) {
    throw new Error(`Unreachable Function regions: ${(inventory.unreachable ?? []).join(', ')}`);
  }
  const expected = [...EXPECTED_FUNCTION_EXPORT_NAMES].sort();
  const expectedSet = new Set<string>(expected);
  const remote = inventory.functions.map((entry) => functionId(entry.name)).sort();
  const missing = expected.filter((id) => !remote.includes(id));
  const unexpected = remote.filter((id) => !expectedSet.has(id));
  if (missing.length > 0 || unexpected.length > 0 || remote.length !== expected.length) {
    throw new Error(
      `Function inventory drift: missing=${missing.join(',')} unexpected=${unexpected.join(',')}`,
    );
  }

  return inventory.functions
    .map((entry) => {
      const id = functionId(entry.name);
      if (functionProject(entry.name) !== project) {
        throw new Error(`${id} is outside project ${project}.`);
      }
      if (functionRegion(entry.name) !== region) {
        throw new Error(`${id} is outside ${region}.`);
      }
      if (entry.state !== 'ACTIVE') throw new Error(`${id} is not ACTIVE.`);
      if (entry.buildConfig?.runtime !== EXPECTED_RUNTIME) {
        throw new Error(`${id} is not running ${EXPECTED_RUNTIME}.`);
      }
      const serviceName = entry.serviceConfig?.service;
      if (!serviceName) throw new Error(`${id} has no Cloud Run service.`);
      const expectedServicePrefix = `projects/${project}/locations/${region}/services/`;
      if (!serviceName.startsWith(expectedServicePrefix)) {
        throw new Error(`${id} Cloud Run service is outside ${project}/${region}.`);
      }
      if (entry.serviceConfig.ingressSettings !== 'ALLOW_ALL') {
        throw new Error(`${id} ingress is not ALLOW_ALL.`);
      }
      return {
        id,
        serviceName,
        endpoint: `https://${region}-${project}.cloudfunctions.net/${id}`,
        source: entry,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function loadFirebaseModules(project: string): Promise<{
  readonly auth: FirebaseAuthModule;
  readonly functionsV2: CloudFunctionsV2Module;
  readonly run: CloudRunModule;
}> {
  const require = createRequire(import.meta.url);
  const auth = require('firebase-tools/lib/auth') as FirebaseAuthModule;
  const firebaseRequireAuth =
    require('firebase-tools/lib/requireAuth') as FirebaseRequireAuthModule;
  const functionsV2 = require('firebase-tools/lib/gcp/cloudfunctionsv2') as CloudFunctionsV2Module;
  const run = require('firebase-tools/lib/gcp/run') as CloudRunModule;
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error('No Firebase CLI account is available for remote inspection.');
  await firebaseRequireAuth.requireAuth({ project, user: account.user, tokens: account.tokens });
  return { auth, functionsV2, run };
}

function unconditionalInvokerMembers(policy: IamPolicy): readonly string[] {
  return (policy.bindings ?? [])
    .filter((binding) => binding.role === RUN_INVOKER_ROLE && isUnconditional(binding))
    .flatMap((binding) => binding.members ?? []);
}

async function observePolicy(
  run: CloudRunModule,
  functionRecord: RemoteFunctionRecord,
): Promise<PolicyObservation> {
  const policy = await run.getIamPolicy(functionRecord.serviceName);
  if (!policy.etag) {
    throw new Error(`${functionRecord.id} IAM policy has no etag; refusing an unguarded write.`);
  }
  const members = unconditionalInvokerMembers(policy);
  return {
    functionRecord,
    policy,
    protectedFingerprint: protectedPolicyFingerprint(policy),
    publicInvoker: members.includes(PUBLIC_PRINCIPAL),
    unconditionalInvokerMembers: members,
  };
}

async function probePreflight(
  functionRecord: RemoteFunctionRecord,
  origin: string,
): Promise<PreflightObservation> {
  const response = await fetch(functionRecord.endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
    redirect: 'manual',
  });
  return {
    id: functionRecord.id,
    status: response.status,
    allowOrigin: response.headers.get('access-control-allow-origin') ?? '',
    allowMethods: response.headers.get('access-control-allow-methods') ?? '',
    allowHeaders: response.headers.get('access-control-allow-headers') ?? '',
  };
}

async function observeRemote(arguments_: TransportArguments): Promise<RemoteObservation> {
  const { functionsV2, run } = await loadFirebaseModules(arguments_.project);
  const inventory = await functionsV2.listAllFunctions(arguments_.project);
  const functions = validateRemoteInventory(inventory, arguments_.project, arguments_.region);
  const [policies, services, preflights] = await Promise.all([
    Promise.all(functions.map(async (entry) => await observePolicy(run, entry))),
    Promise.all(functions.map(async (entry) => await run.getService(entry.serviceName))),
    Promise.all(functions.map(async (entry) => await probePreflight(entry, arguments_.origin))),
  ]);
  const invokerIamDisabled = services.filter(
    (service) =>
      service.metadata?.annotations?.['run.googleapis.com/invoker-iam-disabled'] === 'true',
  ).length;
  return { functions, policies, preflights, invokerIamDisabled };
}

function emitObservation(observation: RemoteObservation, label: string): void {
  const publicPolicies = observation.policies.filter((entry) => entry.publicInvoker);
  const emptyPolicies = observation.policies.filter(
    (entry) => entry.unconditionalInvokerMembers.length === 0,
  );
  const forbidden = observation.preflights.filter((entry) => entry.status === 403);
  const successful = observation.preflights.filter(
    (entry) => entry.status >= 200 && entry.status < 300,
  );
  const orgCreate = observation.preflights.find((entry) => entry.id === 'orgCreate');
  console.log(`${label}_FUNCTIONS_REMOTE=${String(observation.functions.length)}`);
  console.log(`${label}_FUNCTIONS_ACTIVE=${String(observation.functions.length)}`);
  console.log(`${label}_RUN_INVOKER_PUBLIC=${String(publicPolicies.length)}`);
  console.log(`${label}_RUN_INVOKER_EMPTY=${String(emptyPolicies.length)}`);
  console.log(`${label}_INVOKER_IAM_DISABLED=${String(observation.invokerIamDisabled)}`);
  console.log(`${label}_OPTIONS_2XX=${String(successful.length)}`);
  console.log(`${label}_OPTIONS_403=${String(forbidden.length)}`);
  console.log(`${label}_ORGCREATE_OPTIONS_STATUS=${String(orgCreate?.status ?? 0)}`);
  console.log(
    `${label}_ORGCREATE_ALLOW_ORIGIN=${orgCreate?.allowOrigin.length ? orgCreate.allowOrigin : 'NONE'}`,
  );
}

function emitMatrix(observation: RemoteObservation): void {
  const policies = new Map(
    observation.policies.map((entry) => [entry.functionRecord.id, entry] as const),
  );
  const preflights = new Map(observation.preflights.map((entry) => [entry.id, entry] as const));
  for (const functionRecord of observation.functions) {
    const policy = policies.get(functionRecord.id);
    const preflight = preflights.get(functionRecord.id);
    if (!policy || !preflight) throw new Error(`Incomplete probe matrix for ${functionRecord.id}.`);
    console.log(
      [
        `FUNCTION=${functionRecord.id}`,
        'STATE=ACTIVE',
        `RUNTIME=${functionRecord.source.buildConfig?.runtime ?? 'UNKNOWN'}`,
        `INGRESS=${functionRecord.source.serviceConfig?.ingressSettings ?? 'UNKNOWN'}`,
        `RUN_INVOKER_PUBLIC=${policy.publicInvoker ? 'YES' : 'NO'}`,
        `RUN_INVOKER_MEMBERS=${policy.unconditionalInvokerMembers.join(',') || 'NONE'}`,
        `OPTIONS_STATUS=${String(preflight.status)}`,
        `ALLOW_ORIGIN=${preflight.allowOrigin || 'NONE'}`,
      ].join('|'),
    );
  }
}

async function probeUnauthenticatedHandler(
  functionRecord: RemoteFunctionRecord,
  origin: string,
): Promise<HandlerObservation> {
  const response = await fetch(functionRecord.endpoint, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: {} }),
    redirect: 'manual',
  });
  let callableStatus = '';
  try {
    const payload = (await response.json()) as { readonly error?: { readonly status?: string } };
    callableStatus = payload.error?.status ?? '';
  } catch {
    callableStatus = '';
  }
  return {
    status: response.status,
    callableStatus,
    handlerReached: response.status !== 403 && callableStatus === 'UNAUTHENTICATED',
  };
}

async function runOfflineVerification(): Promise<void> {
  const [indexSource, callableSource, commandSource, orgSource] = await Promise.all([
    readFile(resolve('functions', 'src', 'index.ts'), 'utf8'),
    readFile(resolve('functions', 'src', 'core', 'callable.ts'), 'utf8'),
    readFile(resolve('functions', 'src', 'core', 'define-command.ts'), 'utf8'),
    readFile(resolve('functions', 'src', 'commands', 'org.ts'), 'utf8'),
  ]);
  const exports = [...indexSource.matchAll(/^export const (\w+) = toCallable\(/gm)]
    .map((match) => match[1] ?? '')
    .sort();
  const expected = [...EXPECTED_FUNCTION_EXPORT_NAMES].sort();
  if (exports.join('\n') !== expected.join('\n')) {
    throw new Error(
      `Callable export drift: expected ${String(expected.length)}, found ${String(exports.length)}.`,
    );
  }
  if (!callableSource.includes('return onCall(COMMAND_RUNTIME_OPTIONS')) {
    throw new Error('The shared callable adapter is not using onCall.');
  }
  const runtimeOptions = callableSource.slice(
    callableSource.indexOf('export const COMMAND_RUNTIME_OPTIONS'),
    callableSource.indexOf('} as const;') + '} as const;'.length,
  );
  for (const forbidden of ['invoker', 'cors', 'ingressSettings', 'enforceAppCheck']) {
    if (runtimeOptions.includes(forbidden)) {
      throw new Error(`Unsupported callable runtime workaround detected: ${forbidden}`);
    }
  }
  const authIndex = commandSource.indexOf('const auth = requireAuth(request);');
  const inputIndex = commandSource.indexOf('const envelope = parseEnvelope');
  if (authIndex < 0 || inputIndex < 0 || authIndex > inputIndex) {
    throw new Error('The command frame no longer authenticates before input and business logic.');
  }
  const orgCreateIndex = orgSource.indexOf('export const orgCreate = defineCommand');
  const orgUpdateIndex = orgSource.indexOf('export const orgUpdateSettings = defineCommand');
  const orgCreateSource = orgSource.slice(orgCreateIndex, orgUpdateIndex);
  if (!orgCreateSource.includes("authorization: { kind: 'AUTHENTICATED' }")) {
    throw new Error('orgCreate is no longer application-authenticated.');
  }
  console.log(`FUNCTION_EXPORT_COUNT=${String(exports.length)}`);
  console.log('FUNCTIONS_TRANSPORT_TYPE=CALLABLE');
  console.log('ORGCREATE_APPLICATION_AUTH=ENFORCED');
  console.log('GENERIC_CORS_MIDDLEWARE=ABSENT');
  console.log('INERT_CALLABLE_INVOKER_OPTION=ABSENT');
  console.log('FUNCTIONS_TRANSPORT_OFFLINE_VERIFICATION=PASS');
}

async function applyPublicInvoker(arguments_: TransportArguments): Promise<void> {
  assertApplyAuthorized(arguments_);
  const before = await observeRemote(arguments_);
  emitObservation(before, 'BEFORE');
  if (before.invokerIamDisabled !== 0) {
    throw new Error('Invoker IAM check is disabled on an unexpected service; refusing to mutate.');
  }
  const { run } = await loadFirebaseModules(arguments_.project);
  const applied: string[] = [];
  const alreadyCorrect: string[] = [];

  for (const observation of before.policies) {
    const merged = mergePublicInvoker(observation.policy);
    if (!merged.changed) {
      alreadyCorrect.push(observation.functionRecord.id);
      continue;
    }
    try {
      await run.setIamPolicy(observation.functionRecord.serviceName, merged.policy);
      applied.push(observation.functionRecord.id);
    } catch (error) {
      console.error(`IAM_APPLIED_BEFORE_FAILURE=${applied.join(',')}`);
      console.error(`IAM_FAILED=${observation.functionRecord.id}`);
      console.error(
        `IAM_PENDING_AFTER_FAILURE=${before.policies
          .map((entry) => entry.functionRecord.id)
          .filter((id) => !applied.includes(id) && !alreadyCorrect.includes(id))
          .join(',')}`,
      );
      throw error;
    }
  }

  const after = await observeRemote(arguments_);
  emitObservation(after, 'AFTER');
  const beforeById = new Map(before.policies.map((entry) => [entry.functionRecord.id, entry]));
  for (const observation of after.policies) {
    const previous = beforeById.get(observation.functionRecord.id);
    if (!previous)
      throw new Error(`Missing pre-mutation policy for ${observation.functionRecord.id}.`);
    if (observation.protectedFingerprint !== previous.protectedFingerprint) {
      throw new Error(`Protected IAM policy content changed for ${observation.functionRecord.id}.`);
    }
    if (!observation.publicInvoker) {
      throw new Error(`Public invoker is still missing for ${observation.functionRecord.id}.`);
    }
  }
  const failedPreflights = after.preflights.filter(
    (entry) => entry.status < 200 || entry.status >= 300,
  );
  if (failedPreflights.length > 0) {
    throw new Error(
      `Callable preflight failures remain: ${failedPreflights.map((entry) => `${entry.id}:${String(entry.status)}`).join(',')}`,
    );
  }
  const orgCreate = after.functions.find((entry) => entry.id === 'orgCreate');
  if (!orgCreate) throw new Error('orgCreate is missing after IAM repair.');
  const handler = await probeUnauthenticatedHandler(orgCreate, arguments_.origin);
  console.log(`IAM_APPLIED=${applied.join(',')}`);
  console.log(`IAM_ALREADY_CORRECT=${alreadyCorrect.join(',')}`);
  console.log('IAM_FAILED=');
  console.log(`ORGCREATE_POST_STATUS=${String(handler.status)}`);
  console.log(`ORGCREATE_CALLABLE_STATUS=${handler.callableStatus || 'NONE'}`);
  console.log(`ORGCREATE_HANDLER_REACHED=${handler.handlerReached ? 'YES' : 'NO'}`);
  if (!handler.handlerReached) {
    throw new Error(
      'orgCreate did not return the expected application-level unauthenticated response.',
    );
  }
  console.log('FUNCTIONS_TRANSPORT_IAM_REPAIR=PASS');
}

async function runRemoteProbe(arguments_: TransportArguments): Promise<void> {
  assertProductionTarget(arguments_);
  const observation = await observeRemote(arguments_);
  emitObservation(observation, 'PROBE');
  emitMatrix(observation);
  console.log('FUNCTIONS_TRANSPORT_REMOTE_PROBE=PASS');
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const arguments_ = parseTransportArguments(argv);
  if (arguments_.mode === 'offline') {
    if (arguments_.apply) throw new Error('--apply is invalid in offline mode.');
    await runOfflineVerification();
    return;
  }
  if (arguments_.mode === 'probe') {
    if (arguments_.apply) throw new Error('--apply is invalid in probe mode.');
    await runRemoteProbe(arguments_);
    return;
  }
  await applyPublicInvoker(arguments_);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  await main();
}
