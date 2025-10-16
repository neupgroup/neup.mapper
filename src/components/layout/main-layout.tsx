
'use client';
import type { ReactNode } from 'react';
import { MainNav } from '@/components/layout/main-nav';
import { Icons } from '@/components/icons';
import { Menu, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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

  return <Link href={href} onClick={handleClick}>{children}</Link>;
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
      <Collapsible
        asChild
        open={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
      >
        <div className="relative w-full min-h-screen overflow-x-hidden">
          <header className="fixed top-0 z-20 w-full border-b bg-background/80 backdrop-blur-sm shadow-md">
            <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-4 md:gap-8">
                <NavLink href="/">
                  <div className="flex items-center gap-2">
                    <Icons.logo className="h-6 w-6 text-primary" />
                    <h1 className="hidden sm:block font-headline text-xl font-semibold">
                      Neup.Mapper
                    </h1>
                  </div>
                </NavLink>
              </div>

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
                <NavLink href="/">
                  <Icons.logo className="h-6 w-6 text-primary" />
                </NavLink>
              </div>

              <div className="flex items-center gap-4">
                <form className="relative ml-auto hidden sm:flex-initial">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                  />
                </form>
                <MobileNav
                  isOpen={isMobileMenuOpen}
                  onToggle={() => setIsMobileMenuOpen((prev) => !prev)}
                />
              </div>
            </div>
          </header>

          <CollapsibleContent className="md:hidden absolute top-16 z-10 w-full bg-card border-b overflow-y-auto data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="p-4 h-[calc(100vh-4rem)] pb-16">
              <MainNav />
            </div>
          </CollapsibleContent>

          <div className="mx-auto flex w-full max-w-[1440px] pt-16">
            <AppSidebar />
            <main className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="p-4 sm:p-6 md:p-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </Collapsible>
  );
}
