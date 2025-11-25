import { useAuth } from '@/lib/auth';
import { db, User } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

export default function Security() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<User | null>(null);

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
  };

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
    </div>
  );
}
