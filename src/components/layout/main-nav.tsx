'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Database, Settings, Code, Table, FileJson } from 'lucide-react';

const navItems = [
  {
    href: '/',
    label: 'AI Schema Builder',
    icon: Database,
  },
  {
    href: '/operate',
    label: 'AI Operation Builder',
    icon: Code,
  },
  {
    href: '/browse',
    label: 'Data Browser',
    icon: Table,
  },
  {
    href: '/schemas',
    label: 'Schema Builder',
    icon: FileJson,
  },
  {
    href: '/configure',
    label: 'Configure',
    icon: Settings,
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
            {
              'bg-muted text-primary': pathname === href,
            }
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
