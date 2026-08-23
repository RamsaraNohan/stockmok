import { useCallback, useEffect, useId, useState, type SyntheticEvent } from 'react';

import {
  loadSettingsPage,
  saveBusinessDefaults,
  saveOrganizationProfile,
  type BusinessDefaultsInput,
  type OrganizationProfileInput,
  type SettingsPageData,
} from '@/services/settings/settingsService';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Input } from '@/ui/primitives/Input';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { PageHeader } from '@/ui/shell/PageHeader';

export interface SettingsScreenProps {
  /**
   * Integration hook for the workspace owner. The router can use this to replace
   * cached Q-006/Q-007 values immediately after C-02, including networkEnabled.
   */
  readonly onSettingsUpdated?: (data: SettingsPageData) => void;
}

const EMPTY_PROFILE: OrganizationProfileInput = { name: '', industry: '', country: '' };
const EMPTY_DEFAULTS: BusinessDefaultsInput = {
  currency: '',
  timezone: '',
  lowStockNotificationsEnabled: false,
  networkEnabled: false,
};

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function SettingsScreen({ onSettingsUpdated }: SettingsScreenProps) {
  const { activeMembership, activeRole } = useWorkspace();
  const orgId = activeMembership?.organizationId;
  const isSettingsAdmin = activeRole === 'OWNER' || activeRole === 'ADMIN';
  const notificationSwitchId = useId();
  const networkSwitchId = useId();

  const [data, setData] = useState<SettingsPageData | null>(null);
  const [profile, setProfile] = useState<OrganizationProfileInput>(EMPTY_PROFILE);
  const [defaults, setDefaults] = useState<BusinessDefaultsInput>(EMPTY_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [defaultsError, setDefaultsError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [defaultsSaved, setDefaultsSaved] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);

  const applyLoadedData = useCallback((next: SettingsPageData) => {
    setData(next);
    setProfile({ name: next.name, industry: next.industry, country: next.country });
    setDefaults({
      currency: next.currency,
      timezone: next.timezone,
      lowStockNotificationsEnabled: next.lowStockNotificationsEnabled,
      networkEnabled: next.networkEnabled,
    });
  }, []);

  const load = useCallback(async () => {
    if (!orgId || !isSettingsAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');
    try {
      applyLoadedData(await loadSettingsPage(orgId));
    } catch (error) {
      setLoadError(messageFrom(error, 'Settings could not be loaded.'));
    } finally {
      setIsLoading(false);
    }
  }, [applyLoadedData, isSettingsAdmin, orgId]);

  useEffect(() => {
    if (!orgId || !isSettingsAdmin) return;

    let cancelled = false;
    void loadSettingsPage(orgId)
      .then((next) => {
        if (!cancelled) {
          setLoadError('');
          applyLoadedData(next);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(messageFrom(error, 'Settings could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyLoadedData, isSettingsAdmin, orgId]);

  const submitProfile = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orgId) return;

    setProfileError('');
    setProfileSaved(false);
    setIsSavingProfile(true);
    try {
      const refreshed = await saveOrganizationProfile(orgId, {
        name: profile.name.trim(),
        industry: profile.industry.trim(),
        country: profile.country.trim().toUpperCase(),
      });
      applyLoadedData(refreshed);
      setProfileSaved(true);
      onSettingsUpdated?.(refreshed);
    } catch (error) {
      // Keep the controlled inputs unchanged so a transient error never erases work.
      setProfileError(messageFrom(error, 'Organization profile could not be saved.'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const submitDefaults = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orgId) return;

    setDefaultsError('');
    setDefaultsSaved(false);
    setIsSavingDefaults(true);
    try {
      const refreshed = await saveBusinessDefaults(orgId, {
        currency: defaults.currency.trim().toUpperCase(),
        timezone: defaults.timezone.trim(),
        lowStockNotificationsEnabled: defaults.lowStockNotificationsEnabled,
        networkEnabled: defaults.networkEnabled,
      });
      applyLoadedData(refreshed);
      setDefaultsSaved(true);
      onSettingsUpdated?.(refreshed);
    } catch (error) {
      // Keep the controlled inputs unchanged so a transient error never erases work.
      setDefaultsError(messageFrom(error, 'Business defaults could not be saved.'));
    } finally {
      setIsSavingDefaults(false);
    }
  };

  if (!isSettingsAdmin) {
    return (
      <ErrorState
        title="Settings access is restricted"
        message="Only an Owner or Admin can open organization settings."
      />
    );
  }

  if (isLoading || data?.organizationId !== orgId) {
    return (
      <div aria-label="Loading settings" className="space-y-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <ErrorState
        title="Settings could not be loaded"
        message={loadError || 'Organization settings are unavailable.'}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  const profileInvalid =
    !profile.name.trim() ||
    !profile.industry.trim() ||
    !/^[A-Za-z]{2}$/.test(profile.country.trim());
  const defaultsInvalid =
    !/^[A-Za-z]{3}$/.test(defaults.currency.trim()) || !defaults.timezone.trim();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage the supported organization profile, defaults, notifications, and features."
      />

      <form
        className="space-y-6 rounded-panel border border-border bg-surface p-6 shadow-sm max-md:p-4"
        onSubmit={(event) => void submitProfile(event)}
      >
        <div>
          <h2 className="text-lg font-bold text-text">Organization Profile</h2>
          <p className="mt-1 text-sm text-text-muted">
            Public business identity used across your Stockmok workspace.
          </p>
        </div>

        {profileError && (
          <p
            aria-live="assertive"
            className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800"
          >
            {profileError}
          </p>
        )}
        {profileSaved && (
          <p
            aria-live="polite"
            className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800"
          >
            Organization profile saved.
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="Organization name"
            required
            value={profile.name}
            onChange={(event) => {
              setProfile({ ...profile, name: event.target.value });
              setProfileSaved(false);
            }}
          />
          <Input
            label="Handle"
            helperText="Handles are immutable in Releases A and B."
            readOnly
            value={`@${data.handle}`}
          />
          <Input
            label="Industry"
            required
            value={profile.industry}
            onChange={(event) => {
              setProfile({ ...profile, industry: event.target.value });
              setProfileSaved(false);
            }}
          />
          <Input
            error={
              profile.country.trim() && !/^[A-Za-z]{2}$/.test(profile.country.trim())
                ? 'Enter a two-letter ISO country code.'
                : undefined
            }
            helperText="Two-letter ISO country code"
            label="Country"
            maxLength={2}
            required
            value={profile.country}
            onChange={(event) => {
              setProfile({ ...profile, country: event.target.value.toUpperCase() });
              setProfileSaved(false);
            }}
          />
        </div>

        <div className="flex justify-end border-t border-border pt-5">
          <Button
            disabled={profileInvalid || isSavingProfile}
            isLoading={isSavingProfile}
            type="submit"
          >
            Save organization profile
          </Button>
        </div>
      </form>

      <form
        className="space-y-8 rounded-panel border border-border bg-surface p-6 shadow-sm max-md:p-4"
        onSubmit={(event) => void submitDefaults(event)}
      >
        {defaultsError && (
          <p
            aria-live="assertive"
            className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800"
          >
            {defaultsError}
          </p>
        )}
        {defaultsSaved && (
          <p
            aria-live="polite"
            className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800"
          >
            Business defaults saved.
          </p>
        )}

        <section aria-labelledby="business-defaults-title" className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-text" id="business-defaults-title">
              Defaults
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Organization-wide display and procurement defaults for Releases A and B.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Default warehouse"
              helperText="Change the default from Warehouses & Store Rooms."
              readOnly
              value={data.defaultWarehouseName}
            />
            <Input
              error={
                defaults.currency.trim() && !/^[A-Za-z]{3}$/.test(defaults.currency.trim())
                  ? 'Enter a three-letter ISO currency code.'
                  : undefined
              }
              helperText="Single organization currency in Releases A and B"
              label="Currency"
              maxLength={3}
              required
              value={defaults.currency}
              onChange={(event) => {
                setDefaults({ ...defaults, currency: event.target.value.toUpperCase() });
                setDefaultsSaved(false);
              }}
            />
            <Input
              label="Timezone"
              helperText="Use an IANA timezone, for example Asia/Colombo."
              required
              value={defaults.timezone}
              onChange={(event) => {
                setDefaults({ ...defaults, timezone: event.target.value });
                setDefaultsSaved(false);
              }}
            />
            <Input
              label="Purchase order prefix"
              helperText="The frozen C-02 contract does not permit changing this value."
              readOnly
              value={data.purchaseOrderPrefix}
            />
            <Input
              label="Quantity precision"
              helperText="Fixed at three decimal places in Releases A and B."
              readOnly
              value={String(data.quantityPrecision)}
            />
          </div>
        </section>

        <section
          aria-labelledby="notifications-title"
          className="space-y-4 border-t border-border pt-6"
        >
          <div>
            <h2 className="text-lg font-bold text-text" id="notifications-title">
              Notifications
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Choose which supported stock alerts are generated.
            </p>
          </div>
          <div className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <label
                className="block cursor-pointer text-sm font-bold text-text"
                htmlFor={notificationSwitchId}
                id={`${notificationSwitchId}-label`}
              >
                Low-stock notifications
              </label>
              <span
                className="mt-1 block text-xs text-text-muted"
                id={`${notificationSwitchId}-description`}
              >
                Notify members when stock crosses the configured minimum.
              </span>
            </span>
            <input
              aria-describedby={`${notificationSwitchId}-description`}
              aria-labelledby={`${notificationSwitchId}-label`}
              checked={defaults.lowStockNotificationsEnabled}
              className="size-5 accent-primary"
              id={notificationSwitchId}
              onChange={(event) => {
                setDefaults({ ...defaults, lowStockNotificationsEnabled: event.target.checked });
                setDefaultsSaved(false);
              }}
              role="switch"
              type="checkbox"
            />
          </div>
        </section>

        <section
          aria-labelledby="feature-flags-title"
          className="space-y-4 border-t border-border pt-6"
        >
          <div>
            <h2 className="text-lg font-bold text-text" id="feature-flags-title">
              Feature Flags
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Enable or disable supported organization modules.
            </p>
          </div>
          <div className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border p-4">
            <span>
              <label
                className="block cursor-pointer text-sm font-bold text-text"
                htmlFor={networkSwitchId}
                id={`${networkSwitchId}-label`}
              >
                Network
              </label>
              <span
                className="mt-1 block text-xs text-text-muted"
                id={`${networkSwitchId}-description`}
              >
                Turning Network off removes Network navigation and makes its direct routes
                unavailable.
              </span>
            </span>
            <input
              aria-describedby={`${networkSwitchId}-description`}
              aria-labelledby={`${networkSwitchId}-label`}
              checked={defaults.networkEnabled}
              className="size-5 accent-primary"
              id={networkSwitchId}
              onChange={(event) => {
                setDefaults({ ...defaults, networkEnabled: event.target.checked });
                setDefaultsSaved(false);
              }}
              role="switch"
              type="checkbox"
            />
          </div>
        </section>

        <div className="flex justify-end border-t border-border pt-5">
          <Button
            disabled={defaultsInvalid || isSavingDefaults}
            isLoading={isSavingDefaults}
            type="submit"
          >
            Save business defaults
          </Button>
        </div>
      </form>
    </div>
  );
}
