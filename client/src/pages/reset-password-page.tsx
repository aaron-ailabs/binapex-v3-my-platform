import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Extract token from query params manually since wouter doesn't parse them automatically in useLocation
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Link",
        description: "The password reset link is invalid or missing a token.",
      });
    }
  }, [toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Please ensure both passwords are the same.",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/auth/reset-password', { 
        token, 
        password, 
        confirmPassword 
      });
      setSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "You can now login with your new password.",
      });
    } catch (error: any) {
      const message = error.message || "Something went wrong. Please try again.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message.includes("400") ? "Invalid or expired token, or weak password." : "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center pb-2">
             <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                 <AlertCircle className="w-7 h-7" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">Invalid Link</CardTitle>
            <CardDescription>The password reset link is missing or invalid.</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => setLocation('/auth')}>
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl font-bold tracking-tight">Set New Password</CardTitle>
          <CardDescription>Please enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg">Password Updated</h4>
                <p className="text-sm text-muted-foreground">
                  Your password has been successfully reset. You can now login with your new credentials.
                </p>
              </div>
              <Button className="mt-4 w-full font-bold shadow-lg shadow-primary/20" onClick={() => setLocation('/auth')}>
                Go to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="bg-background/50"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required 
                  className="bg-background/50"
                  minLength={8}
                />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Password requirements:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>At least 8 characters long</li>
                  <li>Include uppercase & lowercase letters</li>
                  <li>Include at least one number</li>
                  <li>Include at least one special character</li>
                </ul>
              </div>
              <Button type="submit" className="w-full font-bold text-md shadow-lg shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-xs text-muted-foreground">
           <p>Protected by industry standard encryption.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
