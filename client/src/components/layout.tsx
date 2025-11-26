import React, { useState, useEffect } from 'react';
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
  Search,
  Settings,
  ChevronRight,
  ChevronDown,
  Building2,
  FileSearch,
  Activity,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from '@/lib/utils';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, token } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['Finance', 'Management', 'System']);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Session Timeout
  useEffect(() => {
    if (!user) return;
    
    // 15 minutes timeout
    const TIMEOUT_MS = 15 * 60 * 1000; 
    const CHECK_INTERVAL = 60 * 1000; // Check every minute
    
    let lastActivity = Date.now();
    
    const updateActivity = () => {
      lastActivity = Date.now();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    
    let throttleTimer: NodeJS.Timeout | null = null;
    const handleActivity = () => {
        if (!throttleTimer) {
            updateActivity();
            throttleTimer = setTimeout(() => {
                throttleTimer = null;
            }, 1000); // Throttle updates to once per second
        }
    };

    events.forEach(e => window.addEventListener(e, handleActivity));
    
    const checkInterval = setInterval(() => {
        if (Date.now() - lastActivity > TIMEOUT_MS) {
            toast({
                title: "Session Expired",
                description: "You have been logged out due to inactivity.",
                variant: "destructive"
            });
            logout();
        }
    }, CHECK_INTERVAL);

    return () => {
        events.forEach(e => window.removeEventListener(e, handleActivity));
        clearInterval(checkInterval);
        if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, logout, toast]);

  useEffect(() => {
    let es: EventSource | null = null;
    let mounted = true;
    if (!token) return () => { mounted = false; try { es?.close(); } catch {} };
    const init = async () => {
      try {
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' };
        const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/notifications?unread=1`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (mounted) setUnreadCount(Array.isArray(list) ? list.length : 0);
        }
      } catch {}
      try {
        const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';
        const url = `${apiBase}/notifications/stream?token=${encodeURIComponent(token)}`;
        es = new EventSource(url);
        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data || '{}');
            if (typeof data.unreadCount === 'number') setUnreadCount(data.unreadCount);
          } catch {}
        };
      } catch {}
    };
    init();
    return () => {
      mounted = false;
      try { es?.close(); } catch {}
    };
  }, [user, token]);

  // Format breadcrumbs
  const pathSegments = location.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment: string, index: number) => {
    const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    return { href, label };
  });

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

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

  // Admin Links - Grouped
  const adminLinksGrouped = [
    {
      group: 'Overview',
      items: [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      group: 'Finance',
      items: [
        { href: '/admin/transactions?type=Deposit', label: 'Deposit Requests', icon: Wallet },
        { href: '/admin/transactions?type=Withdrawal', label: 'Withdrawal Requests', icon: ArrowRightLeft },
        { href: '/admin/banks', label: 'Bank Accounts', icon: Building2 },
        { href: '/admin/allocations', label: 'Fund Allocation', icon: CreditCard }
      ]
    },
    {
      group: 'Management',
      items: [
        { href: '/admin/users', label: 'User Management', icon: Users },
        { href: '/admin/kyc', label: 'KYC Queue', icon: FileText },
        { href: '/admin/trading', label: 'Trading Monitor', icon: Activity },
        { href: '/admin/audit', label: 'Audit Log', icon: FileSearch }
      ]
    },
    {
      group: 'System',
      items: [
        { href: '/admin/settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  const csLinks = [
    { href: '/cs', label: 'Ticket Queue', icon: Headset },
    { href: '/cs/lookup', label: 'User Lookup', icon: Search },
  ];

  const NavContent = () => {
    const isAdmin = user.role === 'Admin';
    
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight text-sidebar-primary">
            <div className="w-8 h-8 rounded bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
              <img src="/logo.svg" alt="Logo" className="w-6 h-6" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerText = 'B'; }} />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sidebar-primary to-sidebar-foreground">BINAPEX</span>
            {isAdmin && <Badge variant="secondary" className="ml-2 text-[10px] h-5 px-1.5">ADMIN</Badge>}
          </div>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {isAdmin ? (
            // Admin Grouped Navigation with collapsible groups
            adminLinksGrouped.map((group) => (
              <Collapsible key={group.group} open={openGroups.includes(group.group)} onOpenChange={() => toggleGroup(group.group)}>
                {group.group !== 'Overview' && (
                   <CollapsibleTrigger className="flex items-center justify-between px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                     <span>{group.group}</span>
                     <ChevronDown className={cn("w-3 h-3 transition-transform", openGroups.includes(group.group) ? "rotate-180" : "")} />
                   </CollapsibleTrigger>
                )}
                <CollapsibleContent className="space-y-1">
                  {group.items.map(link => {
                     const Icon = link.icon;
                     const isActive = location === link.href || location.startsWith(link.href + '?');
                     return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group relative",
                            isActive
                              ? "bg-sidebar-primary/10 text-sidebar-primary"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                          onClick={() => setMobileOpen(false)}
                        >
                          <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive && "text-sidebar-primary")} />
                          {link.label}
                          {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sidebar-primary rounded-r-full" />}
                        </Link>
                     );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))
          ) : (
            // Standard Navigation for Traders/CS
            (user.role === 'Customer Service' ? csLinks : traderLinks).map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
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
                </Link>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent/70 transition-colors cursor-pointer group">
            <div className="relative">
              <Avatar className="w-9 h-9 border border-sidebar-border">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-sidebar-accent rounded-full"></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground group-hover:text-sidebar-primary transition-colors">{user.name}</p>
              <div className="flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                 <p className="text-[10px] text-muted-foreground truncate">Online • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        {/* Header */}
      <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden -ml-2"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="hidden md:flex flex-col gap-1">
               <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumbs.map((crumb: { href: string; label: string }, i: number) => (
                    <React.Fragment key={crumb.href}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {i === breadcrumbs.length - 1 ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-5 text-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 
