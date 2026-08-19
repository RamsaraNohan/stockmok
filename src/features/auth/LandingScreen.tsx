import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/ui/primitives/Button';

export function LandingScreen() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-border bg-surface border-b">
        <div className="mx-auto flex min-h-16 w-[min(calc(100%-2rem),90rem)] items-center justify-between gap-4 max-md:w-[min(calc(100%-1.5rem),90rem)]">
          <div className="flex items-center gap-2.5">
            <span className="bg-primary text-surface grid size-8 place-items-center rounded-lg font-extrabold">
              S
            </span>
            <span className="text-text font-extrabold text-lg tracking-tight">Stockmok</span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-[90rem] px-8 py-20 max-md:px-4 max-md:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-text text-4xl font-extrabold tracking-tight max-md:text-3xl sm:text-5xl">
              Multi-Tenant Inventory & Procurement Operating System
            </h1>
            <p className="text-text-muted mt-6 text-lg leading-relaxed max-md:text-base">
              Built for businesses managing stock, warehouses, purchase orders, and connected B2B
              supplier workflows with strict role-based authorization.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4 max-md:flex-col max-md:items-stretch">
              <Link to="/signup">
                <Button className="w-full" size="lg" variant="primary">
                  <span>Start Workspace Free</span>
                  <ArrowRight className="ml-2 size-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button className="w-full" size="lg" variant="secondary">
                  Sign In to Existing Workspace
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-surface border-border border-y py-16 max-md:py-10">
          <div className="mx-auto max-w-[90rem] px-8 max-md:px-4">
            <div className="grid grid-cols-3 gap-8 max-md:grid-cols-1">
              <div className="border-border rounded-panel border p-6">
                <Zap className="text-primary mb-3 size-8" />
                <h3 className="text-text font-bold text-lg">Integer Milli Precision</h3>
                <p className="text-text-muted mt-2 text-sm leading-relaxed">
                  Quantities stored in integer milli-units and money in minor units for zero
                  floating-point rounding errors across movements.
                </p>
              </div>

              <div className="border-border rounded-panel border p-6">
                <ShieldCheck className="text-primary mb-3 size-8" />
                <h3 className="text-text font-bold text-lg">Strict Tenant Isolation</h3>
                <p className="text-text-muted mt-2 text-sm leading-relaxed">
                  Isolated workspace bounds, server-side security rules, and clean query cache
                  clearing across organization switches.
                </p>
              </div>

              <div className="border-border rounded-panel border p-6">
                <CheckCircle2 className="text-primary mb-3 size-8" />
                <h3 className="text-text font-bold text-lg">Role-Aware Authorization</h3>
                <p className="text-text-muted mt-2 text-sm leading-relaxed">
                  Seven role capabilities (Owner, Admin, Inventory Manager, Procurement Manager,
                  Storekeeper, Analyst, Viewer).
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border bg-surface border-t py-8">
        <div className="text-text-muted mx-auto max-w-[90rem] px-8 text-center text-xs max-md:px-4">
          © 2026 Stockmok Inc. All rights reserved. Built with React 19 & Tailwind.
        </div>
      </footer>
    </div>
  );
}
