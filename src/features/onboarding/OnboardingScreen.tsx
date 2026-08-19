import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useWorkspace } from '@/services/workspace/useWorkspace';
import { executeCreateOrgCommand } from '@/services/workspace/workspaceService';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Stepper } from '@/ui/primitives/Stepper';

const onboardingSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(120),
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(30, 'Handle must be 30 chars or less')
    .regex(/^[a-z0-9-]{3,30}$/, 'Lower-case letters, numbers, and hyphens only'),
  industry: z.string().min(1, 'Industry is required'),
  country: z.string().length(2, '2-letter ISO country code (e.g. US, IN)'),
  currency: z.string().length(3, '3-letter currency code (e.g. USD, EUR)'),
  timezone: z.string().min(1, 'Timezone is required'),
  warehouseName: z.string().min(1, 'Warehouse name is required'),
  warehouseType: z.enum(['STORE_ROOM', 'REFRIGERATED', 'FREEZER', 'KITCHEN', 'OTHER']),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: 1, label: 'Identity' },
  { id: 2, label: 'Locale' },
  { id: 3, label: 'Warehouse' },
  { id: 4, label: 'Review' },
] as const;

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { refreshMemberships, setActiveHandle } = useWorkspace();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      country: 'US',
      currency: 'USD',
      timezone: 'UTC',
      warehouseType: 'STORE_ROOM',
    },
  });

  const handleNameChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    setValue('handle', slug, { shouldValidate: true });
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof OnboardingFormData)[] = [];
    if (currentStep === 1) fieldsToValidate = ['name', 'handle', 'industry'];
    if (currentStep === 2) fieldsToValidate = ['country', 'currency', 'timezone'];
    if (currentStep === 3) fieldsToValidate = ['warehouseName', 'warehouseType'];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: OnboardingFormData) => {
    setSubmitError(null);
    try {
      await executeCreateOrgCommand(data);
      const fresh = await refreshMemberships();
      if (fresh.length > 0) {
        await setActiveHandle(data.handle);
        void navigate(`/app/${data.handle}/dashboard`);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const values = getValues();

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-surface border-border w-full max-w-xl rounded-panel border p-8 shadow-xl max-md:p-6">
        <div className="text-center mb-6">
          <h1 className="text-text text-2xl font-bold">Create your Organization</h1>
          <p className="text-text-muted mt-1 text-sm">
            Set up your multi-tenant inventory workspace
          </p>
        </div>

        <Stepper className="mb-8" currentStep={currentStep} steps={STEPS} />

        {submitError && (
          <div className="bg-amber-50 border-amber-200 text-amber-900 mb-6 rounded-lg border p-4 text-xs font-semibold">
            {submitError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          {currentStep === 1 && (
            <div className="flex flex-col gap-4">
              <Input
                error={errors.name?.message}
                label="Business / Organization Name"
                placeholder="Acme Trading Co"
                required
                {...register('name', {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    handleNameChange(e.target.value);
                  },
                })}
              />

              <Input
                error={errors.handle?.message}
                helperText="Unique directory handle used in your workspace URL (/app/handle)"
                label="Workspace Handle"
                placeholder="acme-trading"
                required
                {...register('handle')}
              />

              <Input
                error={errors.industry?.message}
                label="Industry"
                placeholder="Retail / Wholesale / F&B"
                required
                {...register('industry')}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-4">
              <Input
                error={errors.country?.message}
                helperText="2-letter ISO country code"
                label="Country Code"
                placeholder="US"
                required
                {...register('country')}
              />

              <Input
                error={errors.currency?.message}
                helperText="3-letter currency code"
                label="Currency Code"
                placeholder="USD"
                required
                {...register('currency')}
              />

              <Input
                error={errors.timezone?.message}
                label="Timezone"
                placeholder="America/New_York"
                required
                {...register('timezone')}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col gap-4">
              <Input
                error={errors.warehouseName?.message}
                label="Primary Warehouse Name"
                placeholder="Main Distribution Center"
                required
                {...register('warehouseName')}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-text font-bold text-sm" htmlFor="warehouseTypeSelect">
                  Warehouse Type
                </label>
                <select
                  className="border-border bg-surface text-text w-full rounded-lg border px-3 py-2.5 text-sm focus-visible:outline-primary min-h-[40px] max-md:min-h-[44px]"
                  id="warehouseTypeSelect"
                  {...register('warehouseType')}
                >
                  <option value="STORE_ROOM">Store Room</option>
                  <option value="REFRIGERATED">Refrigerated</option>
                  <option value="FREEZER">Freezer</option>
                  <option value="KITCHEN">Kitchen</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 text-sm">
              <h3 className="font-bold text-text mb-1">Organization Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-text-muted">Business Name:</span>
                <span className="font-bold text-text">{values.name}</span>
                <span className="text-text-muted">Handle:</span>
                <span className="font-mono text-text">@{values.handle}</span>
                <span className="text-text-muted">Industry:</span>
                <span className="text-text">{values.industry}</span>
                <span className="text-text-muted">Locale:</span>
                <span className="text-text">
                  {values.country} ({values.currency}, {values.timezone})
                </span>
                <span className="text-text-muted">Warehouse:</span>
                <span className="text-text">
                  {values.warehouseName} ({values.warehouseType})
                </span>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-4">
            {currentStep > 1 ? (
              <Button type="button" variant="secondary" onClick={prevStep}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={() => {
                  void nextStep();
                }}
              >
                Continue
              </Button>
            ) : (
              <Button isLoading={isSubmitting} type="submit">
                Create Workspace
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
