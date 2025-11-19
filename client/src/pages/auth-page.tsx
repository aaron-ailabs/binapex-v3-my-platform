import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { ShieldCheck } from 'lucide-react';

export default function AuthPage() {
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) {
    if (user.role === 'Admin') setLocation('/admin');
    else if (user.role === 'Customer Service') setLocation('/cs');
    else setLocation('/dashboard');
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
               <ShieldCheck className="w-7 h-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to BINAPEX</CardTitle>
          <CardDescription>Enter your credentials to access the terminal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="trader@binapex.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="bg-background/50"
              />
            </div>
            <Button type="submit" className="w-full font-bold text-md shadow-lg shadow-primary/20">
              Sign In
            </Button>
          </form>

          <div className="mt-6 grid grid-cols-2 gap-3">
             <Button variant="outline" className="text-xs h-auto py-2 flex flex-col gap-1" onClick={() => setEmail('trader@binapex.com')}>
                <span className="font-bold">Trader Demo</span>
                <span className="text-muted-foreground font-normal">trader@binapex.com</span>
             </Button>
             <Button variant="outline" className="text-xs h-auto py-2 flex flex-col gap-1" onClick={() => setEmail('admin@binapex.com')}>
                <span className="font-bold">Admin Demo</span>
                <span className="text-muted-foreground font-normal">admin@binapex.com</span>
             </Button>
             <Button variant="outline" className="col-span-2 text-xs h-auto py-2 flex flex-col gap-1" onClick={() => setEmail('support@binapex.com')}>
                <span className="font-bold">CS Demo</span>
                <span className="text-muted-foreground font-normal">support@binapex.com</span>
             </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-xs text-muted-foreground">
           <p>Protected by industry standard encryption.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
