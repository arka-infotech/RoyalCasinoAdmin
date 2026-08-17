export type MenuItem = { title: string; href: string };
export type MenuSection = { title: string; items: MenuItem[] };

export const sidebarSections: MenuSection[] = [
  {
    title: 'MAIN',
    items: [{ title: 'Dashboard', href: '/dashboard' }],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { title: 'Super Distributor', href: '/management/super-distributor' },
      { title: 'Distributor', href: '/management/distributor' },
      { title: 'Retailer', href: '/management/retailer' },
      { title: 'Users', href: '/management/users' },
      { title: 'Users wallet', href: '/management/users-wallet' },
      { title: 'Online Players', href: '/management/online-players' },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { title: 'TurnOver Report', href: '/reports/turnover-report' },
      { title: 'Transaction Report', href: '/reports/transaction-report' },
      { title: 'Commission Payout Report', href: '/reports/commission-payout-report' },
      { title: 'Admin Commission Report', href: '/reports/admin-commission-report' },
    ],
  },
  {
    title: 'GAME',
    items: [{ title: 'Win Percentage', href: '/game/win-percentage' }],
  },
  {
    title: 'LOGS ACTIVITY',
    items: [{ title: 'Logs', href: '/logs-activity/logs' }],
  },
];

const ADMIN_ONLY = [
  '/game/win-percentage',
  '/logs-activity/logs',
  '/reports/admin-commission-report',
];

const HIDDEN_ITEMS_BY_ROLE: Record<string, string[]> = {
  super_distributor: ['/management/super-distributor', '/game/win-percentage', ...ADMIN_ONLY],
  distributor: [
    '/management/super-distributor',
    '/management/distributor',
    '/game/win-percentage',
    ...ADMIN_ONLY,
  ],
  retailer: [
    '/management/super-distributor',
    '/management/distributor',
    '/management/retailer',
    '/management/users',
    '/game/win-percentage',
    ...ADMIN_ONLY,
  ],
};

export function getSidebarSections(role: string): MenuSection[] {
  const hiddenHrefs = new Set(HIDDEN_ITEMS_BY_ROLE[role] ?? []);
  if (hiddenHrefs.size === 0) return sidebarSections;
  return sidebarSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !hiddenHrefs.has(item.href)),
    }))
    .filter((section) => section.items.length > 0);
}
