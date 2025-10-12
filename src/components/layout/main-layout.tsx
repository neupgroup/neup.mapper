'use client';
import type { ReactNode } from 'react';
import { MainNav } from '@/components/layout/main-nav';
import { Icons } from '@/components/icons';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePathname } from 'next/navigation';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import NProgress from 'nprogress';

function AppSidebar() {
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 flex-shrink-0 border-r bg-card md:block">
      <ScrollArea className="h-full w-full">
        <div className="p-4">
          <MainNav />
        </div>
      </ScrollArea>
    </aside>
  );
}

function MobileNav({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggle}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
        <span className="sr-only">Toggle Menu</span>
      </Button>
    </CollapsibleTrigger>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== href) {
      NProgress.configure({ showSpinner: false });
      NProgress.start();
    }
  };

  return (
    <Link href={href} onClick={handleClick}>
      {children}
    </Link>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Stop loading bar and close menu on route change
    NProgress.done();
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <Collapsible
        asChild
        open={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
      >
        <div className="relative w-full">
          <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-4 md:gap-8">
                 <NavLink href="/">
                      <div className="flex items-center gap-2">
                        <Icons.logo className="h-6 w-6 text-primary" />
                        <h1 className="hidden sm:block font-headline text-xl font-semibold">Neup.ORM</h1>
                      </div>
                    </NavLink>
              </div>

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
                <NavLink href="/">
                   <Icons.logo className="h-6 w-6 text-primary" />
                </NavLink>
              </div>

              <div className="flex items-center gap-4">
                <MobileNav
                  isOpen={isMobileMenuOpen}
                  onToggle={() => setIsMobileMenuOpen((prev) => !prev)}
                />
              </div>
            </div>
          </header>

          <CollapsibleContent className="absolute top-16 z-10 w-full overflow-y-auto border-b bg-card data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down md:hidden">
            <div className="h-[calc(100vh-4rem)] p-4 pb-16">
              <MainNav />
            </div>
          </CollapsibleContent>

          <div className="flex flex-1 h-[calc(100vh-4rem)]">
            <div className="mx-auto flex w-full max-w-[1440px]">
              <AppSidebar />
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                {children}
              </main>
            </div>
          </div>
        </div>
      </Collapsible>
    </div>
  );
}
