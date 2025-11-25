import { useAuth } from '@/lib/auth';
import { db, User } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { Eye, EyeOff, Shield, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
=======
>>>>>>> 2607d3e9083655939ee8c7c42f837ed16908c6d4

export default function Security() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<User | null>(null);
<<<<<<< HEAD
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
  
  // Withdrawal password state
  const [withdrawalPassword, setWithdrawalPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [verificationChannel, setVerificationChannel] = useState<'email' | 'sms'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [events, setEvents] = useState<any[]>([]);
=======
>>>>>>> 2607d3e9083655939ee8c7c42f837ed16908c6d4

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
  };

<<<<<<< HEAD
  // Validate withdrawal password
  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
    
    const strength = Object.values(requirements).filter(Boolean).length * 20;
    
    setPasswordRequirements(requirements);
    setPasswordStrength(strength);
    
    return Object.values(requirements).every(Boolean);
  };

  const handleWithdrawalPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setWithdrawalPassword(password);
    validatePassword(password);
  };

  const handleSetWithdrawalPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword(withdrawalPassword)) {
      toast({
        variant: 'destructive',
        title: 'Weak Password',
        description: 'Please meet all password requirements.'
      });
      return;
    }
    
    if (withdrawalPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords Mismatch',
        description: 'Passwords do not match.'
      });
      return;
    }
    
    try {
      const res = await fetch(`${apiBase}/security/withdrawal-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('binapex_token') || ''}` },
        body: JSON.stringify({ password: withdrawalPassword, confirmPassword, code: verificationCode, channel: verificationChannel })
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ message: 'Failed' }));
        throw new Error(msg.message || 'Failed');
      }
      toast({ title: 'Withdrawal Password Set', description: 'Your withdrawal password has been set successfully.' });
      setWithdrawalPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setPasswordStrength(0);
      const ev = await fetch(`${apiBase}/security/events`, { headers: { Authorization: `Bearer ${localStorage.getItem('binapex_token') || ''}` } });
      if (ev.ok) setEvents(await ev.json());
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Failed to set withdrawal password.' });
    }
  };

=======
>>>>>>> 2607d3e9083655939ee8c7c42f837ed16908c6d4
  useEffect(() => {
    if (user) {
      setProfile(user);
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
          const updated = { ...user, ip_address: data.ip };
          setProfile(updated);
          db.updateUser(updated);
        })
        .catch(() => {});
<<<<<<< HEAD
      fetch(`${apiBase}/security/events`, { headers: { Authorization: `Bearer ${localStorage.getItem('binapex_token') || ''}` } })
        .then(r => r.ok ? r.json() : [])
        .then(setEvents)
        .catch(() => {});
=======
>>>>>>> 2607d3e9083655939ee8c7c42f837ed16908c6d4
    }
  }, [user]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground">Manage your account security and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Additional information for account verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={profile?.phone || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : prev)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={profile?.bank_account?.bank_name || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, bank_account: { ...(prev.bank_account || { bank_name: '', account_number: '' }), bank_name: e.target.value } } : prev)} />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input value={profile?.bank_account?.account_number || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, bank_account: { ...(prev.bank_account || { bank_name: '', account_number: '' }), account_number: e.target.value } } : prev)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Detected IP Address</Label>
            <Input value={profile?.ip_address || ''} disabled />
          </div>
          <Button onClick={() => { if (profile) { db.updateUser(profile); toast({ title: 'Profile Saved', description: 'Additional info updated.' }); } }}>Save Profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input type="password" />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input type="password" />
            </div>
            <Button type="submit">Update Password</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable 2FA</Label>
              <p className="text-sm text-muted-foreground">
                Protect your account with Google Authenticator.
              </p>
            </div>
            <Switch />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
               <Label className="text-base">Email Notifications</Label>
               <p className="text-sm text-muted-foreground">Receive emails about new logins.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Password Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Withdrawal Password
          </CardTitle>
          <CardDescription>
            Set a dedicated password for withdrawal authorization. This password is separate from your login password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetWithdrawalPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdrawal-password">New Withdrawal Password</Label>
              <div className="relative">
                <Input
                  id="withdrawal-password"
                  type={showPassword ? 'text' : 'password'}
                  value={withdrawalPassword}
                  onChange={handleWithdrawalPasswordChange}
                  placeholder="Enter new withdrawal password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Password Strength Meter */}
              {withdrawalPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password Strength</span>
                    <span className="font-medium">
                      {passwordStrength < 40 ? 'Weak' : 
                       passwordStrength < 80 ? 'Medium' : 'Strong'}
                    </span>
                  </div>
                  <Progress value={passwordStrength} className="h-2" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your withdrawal password"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Verification Method</Label>
                <Select value={verificationChannel} onValueChange={(v) => setVerificationChannel(v as 'email' | 'sms')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="Enter code" />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      const r = await fetch(`${apiBase}/security/request-verification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('binapex_token') || ''}` },
                        body: JSON.stringify({ channel: verificationChannel })
                      });
                      if (!r.ok) throw new Error('Failed to send code');
                      const j = await r.json();
                      if (j.devCode) setVerificationCode(j.devCode);
                      toast({ title: 'Verification Code Sent', description: `Check your ${verificationChannel}.` });
                    } catch {
                      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send verification code.' });
                    }
                  }}
                  className="w-full"
                >
                  Send Code
                </Button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2 text-sm">
              <p className="font-medium text-muted-foreground">Password Requirements:</p>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  {passwordRequirements.length ? 
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                  <span className={passwordRequirements.length ? 'text-green-500' : 'text-muted-foreground'}>
                    Minimum 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordRequirements.uppercase ? 
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                  <span className={passwordRequirements.uppercase ? 'text-green-500' : 'text-muted-foreground'}>
                    At least one uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordRequirements.lowercase ? 
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                  <span className={passwordRequirements.lowercase ? 'text-green-500' : 'text-muted-foreground'}>
                    At least one lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordRequirements.number ? 
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                  <span className={passwordRequirements.number ? 'text-green-500' : 'text-muted-foreground'}>
                    At least one number
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordRequirements.special ? 
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                  <span className={passwordRequirements.special ? 'text-green-500' : 'text-muted-foreground'}>
                    At least one special character
                  </span>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={!withdrawalPassword || !confirmPassword || passwordStrength < 80}
              className="w-full"
            >
              Set Withdrawal Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Activity
          </CardTitle>
          <CardDescription>
            Recent security events related to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">No recent security events.</div>
            )}
            {events.map((ev, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{ev.type}</p>
                  <p className="text-sm text-muted-foreground">{new Date(ev.timestamp).toLocaleString()} • IP: {ev.ipAddress}</p>
                </div>
                <div className={ev.status === 'success' ? 'text-green-500 text-sm font-medium' : ev.status === 'failed' ? 'text-red-500 text-sm font-medium' : 'text-yellow-500 text-sm font-medium'}>
                  {ev.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
