interface EmulatorRibbonProps {
  readonly enabled: boolean;
}

export function EmulatorRibbon({ enabled }: EmulatorRibbonProps) {
  if (!enabled) {
    return null;
  }

  return (
    <div
      className="text-warning bg-warning-subtle sticky top-0 z-40 w-full border-b border-amber-500 px-4 py-1 text-center text-xs font-extrabold tracking-[0.12em]"
      role="status"
      aria-label="Emulator environment"
    >
      EMULATOR
    </div>
  );
}
