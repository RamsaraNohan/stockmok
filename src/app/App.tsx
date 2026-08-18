import { isEmulatorMode } from '@/services/runtime/environment';
import { EmulatorRibbon } from '@/ui/EmulatorRibbon';

interface AppProps {
  readonly emulatorMode?: boolean;
}

const foundationItems = [
  {
    label: 'Routing',
    detail: 'Application shell ready for frozen route authority.',
  },
  {
    label: 'Layering',
    detail: 'Features flow through services into the data boundary.',
  },
  {
    label: 'Validation',
    detail: 'Strict types, lint, unit, build, and browser gates installed.',
  },
] as const;

export function App({
  emulatorMode = isEmulatorMode(import.meta.env.VITE_USE_EMULATORS),
}: AppProps) {
  return (
    <div className="min-h-screen">
      <a
        className="fixed top-2 left-2 z-50 -translate-y-[150%] rounded-control bg-primary px-3 py-2 text-surface focus:translate-y-0"
        href="#main-content"
      >
        Skip to main content
      </a>

      <EmulatorRibbon enabled={emulatorMode} />

      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex min-h-16 w-[min(calc(100%-2rem),90rem)] items-center gap-3 max-md:w-[min(calc(100%-1.5rem),90rem)]">
          <span
            className="bg-primary text-surface grid size-8 place-items-center rounded-lg font-extrabold"
            aria-hidden="true"
          >
            S
          </span>
          <span className="text-lg font-bold">Stockmok</span>
          <span className="text-primary bg-primary-subtle ml-auto rounded-full px-2.5 py-1.5 text-xs font-bold">
            F0 foundation
          </span>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-[min(calc(100%-2rem),90rem)] py-16 max-md:w-[min(calc(100%-1.5rem),90rem)] max-md:py-6"
        tabIndex={-1}
      >
        <section
          className="bg-surface border-border max-w-[58rem] rounded-panel border p-[clamp(1.5rem,4vw,3.5rem)] shadow-[0_1rem_3rem_rgb(15_23_42/8%)]"
          aria-labelledby="foundation-title"
        >
          <p className="text-primary mb-3 text-xs font-extrabold tracking-[0.12em] uppercase">
            Frontend execution
          </p>
          <h1
            id="foundation-title"
            className="max-w-[16ch] text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-bold tracking-[-0.035em]"
          >
            Application foundation is ready
          </h1>
          <p className="text-text-muted mt-5 max-w-[66ch] leading-[1.65]">
            This intentionally minimal shell proves the approved frontend toolchain and dependency
            boundaries. Product screens begin only under a separately authorized phase.
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-3 max-md:grid-cols-1">
            {foundationItems.map((item) => (
              <div className="bg-background border-border rounded-lg border p-4" key={item.label}>
                <dt className="text-sm font-bold">{item.label}</dt>
                <dd className="text-text-muted mt-2 text-sm leading-6">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
