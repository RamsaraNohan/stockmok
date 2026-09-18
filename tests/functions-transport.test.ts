import { describe, expect, it } from 'vitest';

import {
  assertApplyAuthorized,
  EXPECTED_RUNTIME,
  mergePublicInvoker,
  parseTransportArguments,
  PRODUCTION_ORIGIN,
  PRODUCTION_PROJECT,
  PRODUCTION_REGION,
  PUBLIC_PRINCIPAL,
  RUN_INVOKER_ROLE,
  protectedPolicyFingerprint,
  validateRemoteInventory,
  type IamPolicy,
  type RemoteInventory,
} from '../scripts/functions-transport.js';
import { EXPECTED_FUNCTION_EXPORT_NAMES } from '../scripts/functions-package-lib.js';

function activeInventory(
  overrides: {
    readonly project?: string;
    readonly region?: string;
    readonly omit?: string;
    readonly extra?: string;
    readonly runtime?: string;
  } = {},
): RemoteInventory {
  const project = overrides.project ?? PRODUCTION_PROJECT;
  const region = overrides.region ?? PRODUCTION_REGION;
  const names = EXPECTED_FUNCTION_EXPORT_NAMES.filter((name) => name !== overrides.omit);
  const completeNames = overrides.extra ? [...names, overrides.extra] : names;
  return {
    functions: completeNames.map((id) => ({
      name: `projects/${project}/locations/${region}/functions/${id}`,
      state: 'ACTIVE',
      buildConfig: { runtime: overrides.runtime ?? EXPECTED_RUNTIME },
      serviceConfig: {
        service: `projects/${project}/locations/${region}/services/${id.toLowerCase()}`,
        ingressSettings: 'ALLOW_ALL',
      },
    })),
    unreachable: [],
  };
}

describe('functions transport policy', () => {
  it('is credential-free and non-mutating by default', () => {
    expect(parseTransportArguments([])).toEqual({
      mode: 'offline',
      project: '',
      region: '',
      origin: '',
      apply: false,
      confirmProject: '',
    });
  });

  it('requires both the apply switch and exact production confirmation', () => {
    const base = [
      '--mode',
      'apply',
      '--project',
      PRODUCTION_PROJECT,
      '--region',
      PRODUCTION_REGION,
      '--origin',
      PRODUCTION_ORIGIN,
    ];
    expect(() => {
      assertApplyAuthorized(parseTransportArguments(base));
    }).toThrow('--apply');
    expect(() => {
      assertApplyAuthorized(parseTransportArguments([...base, '--apply']));
    }).toThrow('--confirm-project');
    expect(() => {
      assertApplyAuthorized(
        parseTransportArguments([...base, '--apply', '--confirm-project', PRODUCTION_PROJECT]),
      );
    }).not.toThrow();
  });

  it('adds only an unconditional public invoker and preserves unrelated policy', () => {
    const policy: IamPolicy = {
      version: 3,
      etag: 'etag-before',
      bindings: [
        { role: 'roles/viewer', members: ['user:owner@example.com'] },
        {
          role: RUN_INVOKER_ROLE,
          members: ['serviceAccount:internal@example.iam.gserviceaccount.com'],
          condition: {
            title: 'internal-only',
            expression: 'request.time < timestamp("2030-01-01T00:00:00Z")',
          },
        },
      ],
    };
    const before = protectedPolicyFingerprint(policy);
    const result = mergePublicInvoker(policy);
    expect(result.changed).toBe(true);
    expect(protectedPolicyFingerprint(result.policy)).toBe(before);
    expect(result.policy.bindings).toContainEqual({
      role: RUN_INVOKER_ROLE,
      members: [PUBLIC_PRINCIPAL],
    });
    expect(result.policy.bindings?.[0]).toEqual(policy.bindings?.[0]);
    expect(result.policy.bindings?.[1]).toEqual(policy.bindings?.[1]);
    expect(result.policy.etag).toBe('etag-before');
    expect(result.policy.version).toBe(3);
  });

  it('is idempotent when an unconditional public invoker already exists', () => {
    const policy: IamPolicy = {
      bindings: [{ role: RUN_INVOKER_ROLE, members: [PUBLIC_PRINCIPAL] }],
    };
    expect(mergePublicInvoker(policy)).toEqual({ policy, changed: false });
  });

  it('requires the exact governed 38-function production inventory', () => {
    expect(
      validateRemoteInventory(activeInventory(), PRODUCTION_PROJECT, PRODUCTION_REGION),
    ).toHaveLength(38);
    expect(() =>
      validateRemoteInventory(
        activeInventory({ omit: EXPECTED_FUNCTION_EXPORT_NAMES[0] }),
        PRODUCTION_PROJECT,
        PRODUCTION_REGION,
      ),
    ).toThrow('inventory drift');
    expect(() =>
      validateRemoteInventory(
        activeInventory({ extra: 'unexpectedFunction' }),
        PRODUCTION_PROJECT,
        PRODUCTION_REGION,
      ),
    ).toThrow('inventory drift');
  });

  it('rejects project, region, and runtime drift', () => {
    expect(() =>
      validateRemoteInventory(
        activeInventory({ project: 'not-stockmok' }),
        PRODUCTION_PROJECT,
        PRODUCTION_REGION,
      ),
    ).toThrow('outside project');
    expect(() =>
      validateRemoteInventory(
        activeInventory({ region: 'us-central1' }),
        PRODUCTION_PROJECT,
        PRODUCTION_REGION,
      ),
    ).toThrow('outside');
    expect(() =>
      validateRemoteInventory(
        activeInventory({ runtime: 'nodejs20' }),
        PRODUCTION_PROJECT,
        PRODUCTION_REGION,
      ),
    ).toThrow(EXPECTED_RUNTIME);
  });
});
