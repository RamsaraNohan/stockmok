import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { DesktopSidebar } from './DesktopSidebar';
import { MobileDrawer } from './MobileDrawer';
import { TopBar } from './TopBar';

export function OrgLayout() {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <a
        className="bg-primary text-surface fixed top-2 left-2 z-50 -translate-y-[150%] rounded-lg px-3 py-2 text-sm font-bold transition-transform focus:translate-y-0"
        href="#main-content"
      >
        Skip to main content
      </a>

      <TopBar
        onOpenMobileDrawer={() => {
          setIsMobileDrawerOpen(true);
        }}
      />

      <div className="mx-auto flex w-full flex-1 max-w-[90rem]">
        <DesktopSidebar />

        <main id="main-content" className="min-w-0 flex-1 p-8 max-md:p-4" tabIndex={-1}>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center p-8">
                <div className="text-secondary">Loading...</div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => {
          setIsMobileDrawerOpen(false);
        }}
      />
    </div>
  );
}
