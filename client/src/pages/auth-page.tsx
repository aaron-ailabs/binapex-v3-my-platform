import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { ShieldCheck } from 'lucide-react';

export default function AuthPage() {
  const { login, register, user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (user) {
    if (user.role === 'Admin') setLocation('/admin');
    else if (user.role === 'Customer Service') setLocation('/cs');
    else setLocation('/dashboard');
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register(regName, regEmail, regPassword);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
               <ShieldCheck className="w-7 h-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">BINAPEX</CardTitle>
          <CardDescription>Professional Trading Platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
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
                 <Button variant="outline" className="text-xs h-auto py-2 flex flex-col gap-1" onClick={() => { setEmail('trader@binapex.com'); setPassword('password'); }}>
                    <span className="font-bold">Trader</span>
                    <span className="text-muted-foreground font-normal text-[10px]">trader@binapex.com</span>
                 </Button>
                 <Button variant="outline" className="text-xs h-auto py-2 flex flex-col gap-1" onClick={() => { setEmail('admin@binapex.com'); setPassword('password'); }}>
                    <span className="font-bold">Admin</span>
                    <span className="text-muted-foreground font-normal text-[10px]">admin@binapex.com</span>
                 </Button>
                 <Button variant="outline" className="col-span-2 text-xs h-auto py-2 flex flex-col gap-1" onClick={() => { setEmail('support@binapex.com'); setPassword('password'); }}>
                    <span className="font-bold">Customer Service</span>
                    <span className="text-muted-foreground font-normal text-[10px]">support@binapex.com</span>
                 </Button>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input 
                    id="reg-name" 
                    placeholder="John Doe" 
                    value={regName} 
                    onChange={(e) => setRegName(e.target.value)}
                    required 
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input 
                    id="reg-email" 
                    type="email" 
                    placeholder="john@example.com" 
                    value={regEmail} 
                    onChange={(e) => setRegEmail(e.target.value)}
                    required 
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-pass">Password</Label>
                  <Input 
                    id="reg-pass" 
                    type="password" 
                    value={regPassword} 
                    onChange={(e) => setRegPassword(e.target.value)}
                    required 
                    className="bg-background/50"
                  />
                </div>
                <Button type="submit" className="w-full font-bold text-md shadow-lg shadow-primary/20">
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-xs text-muted-foreground">
           <p>Protected by industry standard encryption.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
