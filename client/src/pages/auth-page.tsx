import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState, FormEvent } from 'react';
import { useLocation } from 'wouter';
import { ShieldCheck, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const { login, register, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // View State
  const [view, setView] = useState<'login' | 'register' | 'forgot-password'>('login');

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'Admin') setLocation('/admin');
      else if (user.role === 'Customer Service') setLocation('/cs');
      else setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  const handleRegister = (e: FormEvent) => {
    e.preventDefault();
    register(regName, regEmail, regPassword, regPhone);
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmittingForgot(true);
    try {
      await apiRequest('POST', ((import.meta.env.VITE_API_BASE as string) || '/api') + '/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(true);
      toast({
        title: "Request Sent",
        description: "If an account exists with that email, we've sent a password reset link.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmittingForgot(false);
    }
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
          {view === 'forgot-password' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2 mb-4">
                <h3 className="text-lg font-semibold">Reset Password</h3>
                <p className="text-sm text-muted-foreground">Enter your email address and we'll send you a link to reset your password.</p>
              </div>

              {forgotSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg">Check your email</h4>
                    <p className="text-sm text-muted-foreground">
                      We've sent a password reset link to <span className="font-medium text-foreground">{forgotEmail}</span>
                    </p>
                  </div>
                  <Button variant="outline" className="mt-4" onClick={() => { setView('login'); setForgotSuccess(false); setForgotEmail(''); }}>
                    Return to Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email Address</Label>
                    <Input 
                      id="forgot-email" 
                      type="email" 
                      placeholder="trader@binapex.com" 
                      value={forgotEmail} 
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required 
                      className="bg-background/50"
                    />
                  </div>
                  <Button type="submit" className="w-full font-bold text-md shadow-lg shadow-primary/20" disabled={isSubmittingForgot}>
                    {isSubmittingForgot ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => setView('login')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <Tabs defaultValue="login" className="w-full" onValueChange={(v) => setView(v as 'login' | 'register')} value={view}>
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
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        className="text-xs text-primary hover:underline font-medium"
                        onClick={() => setView('forgot-password')}
                      >
                        Forgot Password?
                      </button>
                    </div>
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
                    <Label htmlFor="reg-phone">Phone Number</Label>
                    <Input 
                      id="reg-phone" 
                      type="tel" 
                      placeholder="012-3456789" 
                      value={regPhone} 
                      onChange={(e) => setRegPhone(e.target.value)}
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
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-xs text-muted-foreground">
           <p>Protected by industry standard encryption.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
