import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [decimals, setDecimals] = useState<number>(0);
  const [rounding, setRounding] = useState<'nearest'|'down'|'up'>('nearest');
<<<<<<< HEAD
  const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';
=======
<<<<<<< HEAD
  const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';
=======
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
>>>>>>> 21873c2323019c243e20d6a6b17e3bb6ff36c116
>>>>>>> 929cadfd920a72eb801836e12bd29a24bfe03954

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${apiBase}/credit-score`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (r.ok) {
          const d = await r.json();
          if (d?.config) { setDecimals(Number(d.config.decimals || 0)); setRounding(d.config.rounding || 'nearest'); }
        }
      } catch {}
    })();
  }, []);

  const saveConfig = async () => {
    try {
      const r = await fetch(`${apiBase}/admin/credit-score/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ decimals, rounding })
      });
      if (!r.ok) throw new Error('Failed');
      toast({ title: 'Credit Score Settings Saved' });
    } catch { toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' }); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
        System Settings
      </h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Suspend all trading and user access</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Registrations</Label>
                <p className="text-sm text-muted-foreground">Allow new users to sign up</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Credit Score Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Rounding</Label>
              <Select value={rounding} onValueChange={(v) => setRounding(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearest">Nearest</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                  <SelectItem value="up">Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Decimals</Label>
              <Input type="number" min={0} max={4} value={decimals} onChange={(e) => setDecimals(Math.max(0, Math.min(4, Number(e.target.value || 0))))} />
            </div>
            <Button variant="outline" onClick={saveConfig}>Save</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
