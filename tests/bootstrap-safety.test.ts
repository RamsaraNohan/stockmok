import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertBootstrapSafety } from '../scripts/bootstrap/context.js';

const KEYS = [
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST',
  'GCLOUD_PROJECT',
  'GOOGLE_CLOUD_PROJECT',
  'GOOGLE_APPLICATION_CREDENTIALS',
] as const;

const original = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of KEYS) original.set(key, process.env[key]);
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  process.env.GCLOUD_PROJECT = 'stockmok';
  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
});

afterEach(() => {
  for (const key of KEYS) {
    const value = original.get(key);
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
});

describe('emulator bootstrap safety boundary', () => {
  it('accepts only an explicit local stockmok emulator target', () => {
    expect(() => {
      assertBootstrapSafety(['--target=emulator']);
    }).not.toThrow();
  });

  it('rejects missing target, missing hosts, remote hosts, and wrong projects', () => {
    expect(() => {
      assertBootstrapSafety([]);
    }).toThrow('require --target=emulator');
    delete process.env.FIRESTORE_EMULATOR_HOST;
    expect(() => {
      assertBootstrapSafety(['--target=emulator']);
    }).toThrow('host variables');
    process.env.FIRESTORE_EMULATOR_HOST = 'firestore.example.com:8080';
    expect(() => {
      assertBootstrapSafety(['--target=emulator']);
    }).toThrow('loopback');
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.GCLOUD_PROJECT = 'another-project';
    expect(() => {
      assertBootstrapSafety(['--target=emulator']);
    }).toThrow('stockmok');
  });

  it('rejects production flags and live credentials', () => {
    expect(() => {
      assertBootstrapSafety(['--target=emulator', '--production']);
    }).toThrow('refuse production');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = 'live-service-account.json';
    expect(() => {
      assertBootstrapSafety(['--target=emulator']);
    }).toThrow('forbidden');
  });
});
