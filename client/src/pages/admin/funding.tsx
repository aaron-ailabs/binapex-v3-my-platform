import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { db, type DepositSettings } from '@/lib/mock-data';

export default function FundingSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DepositSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';

  useEffect(() => {
    setSettings(db.getDepositSettings());
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  const handleQrUpload = async (file?: File) => {
    try {
      if (!file || !settings) {
        toast({ variant: 'destructive', title: 'Upload error', description: 'No file selected.' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Max 5MB.' });
        return;
      }
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const res = await fetch(`${apiBase}/chat/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, contentBase64: base64 })
      });
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Upload failed', description: 'Please try again.' });
        return;
      }
      const data = await res.json();
      const url = `${apiBase.replace(/\/$/, '')}/chat/file/${String(data.id || '').trim()}`;
      const next = { ...settings, qr_code_url: url } as DepositSettings;
      setSettings(next);
      db.updateDepositSettings(next);
      toast({ title: 'QR Code Updated', description: 'QR image uploaded successfully.' });
    } catch {
      toast({ variant: 'destructive', title: 'Upload error', description: 'Please try again.' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Funding Settings</h1>
        <p className="text-sm text-muted-foreground">Configure deposit channels and QR payment options.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deposit Settings (Malaysia)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={settings.bank.bank_name} onChange={(e) => setSettings({ ...settings, bank: { ...settings.bank, bank_name: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={settings.bank.account_name} onChange={(e) => setSettings({ ...settings, bank: { ...settings.bank, account_name: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={settings.bank.account_number} onChange={(e) => setSettings({ ...settings, bank: { ...settings.bank, account_number: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>eWallet Provider</Label>
                <Input value={settings.ewallet.provider} onChange={(e) => setSettings({ ...settings, ewallet: { ...settings.ewallet, provider: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>eWallet Account ID</Label>
                <Input value={settings.ewallet.account_id} onChange={(e) => setSettings({ ...settings, ewallet: { ...settings.ewallet, account_id: e.target.value } })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>QR Code</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/png,image/jpeg" onChange={(e) => handleQrUpload(e.target.files?.[0])} className="max-w-[260px]" />
                  {settings.qr_code_url ? (
                    <img src={settings.qr_code_url} alt="QR" className="h-16 w-16 rounded border border-white/10 object-cover" />
                  ) : null}
                </div>
                {settings.qr_code_url ? (
                  <a href={settings.qr_code_url} target="_blank" className="text-xs underline text-muted-foreground">Open current QR</a>
                ) : (
                  <div className="text-xs text-muted-foreground">No QR uploaded yet</div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button onClick={() => {
              if (settings) {
                const acct = settings.bank.account_number.replace(/\D/g, '');
                if (acct.length < 10 || acct.length > 16) {
                  toast({ variant: 'destructive', title: 'Invalid Account Number', description: 'Provide a valid Malaysian bank account number.' });
                  return;
                }
                db.updateDepositSettings({
                  ...settings,
                  bank: { ...settings.bank, account_number: acct }
                });
                toast({ title: 'Settings Saved', description: 'Deposit channels updated.' });
              }
            }}>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
