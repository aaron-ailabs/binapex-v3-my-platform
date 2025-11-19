import React from 'react';
import { useAuth } from '@/lib/auth';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  ArrowRightLeft, 
  History, 
  Shield, 
  Headset, 
  LogOut, 
  Bell, 
  User as UserIcon,
  Menu,
  Users,
  FileText,
  CreditCard,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (!user) return <>{children}</>;

  const traderLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/trade', label: 'Live Trading', icon: TrendingUp },
    { href: '/deposits', label: 'Deposits', icon: Wallet },
    { href: '/withdrawals', label: 'Withdrawals', icon: ArrowRightLeft },
    { href: '/history', label: 'Trade History', icon: History },
    { href: '/security', label: 'Security', icon: Shield },
    { href: '/support', label: 'Support', icon: Headset },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/kyc', label: 'KYC Queue', icon: FileText },
    { href: '/admin/transactions', label: 'Transactions', icon: CreditCard },
  ];

  const csLinks = [
    { href: '/cs', label: 'Ticket Queue', icon: Headset },
    { href: '/cs/lookup', label: 'User Lookup', icon: Search },
  ];

  const links = user.role === 'Admin' ? adminLinks : 
                user.role === 'Customer Service' ? csLinks : 
                traderLinks;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight text-sidebar-primary">
          <div className="w-8 h-8 rounded bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
            B
          </div>
          BINAPEX
        </div>
      </div>
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <a 
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-primary/10 text-sidebar-primary" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </a>
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="w-9 h-9 border border-sidebar-border">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border text-sidebar-foreground">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden -ml-2"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="font-heading font-semibold text-lg hidden sm:block">
              {links.find(l => l.href === location)?.label || 'Portal'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
