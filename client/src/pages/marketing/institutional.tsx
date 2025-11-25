import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Users, Building2, Lock } from 'lucide-react'

export default function Institutional() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div>
          <h1 className="text-4xl font-bold">Institutional</h1>
          <p className="text-gray-400">Compliance, controls, and bespoke services</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-primary" /> Compliance</CardTitle>
              <CardDescription>Regulatory alignment and auditing</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-300">KYC, 2FA, audit trails, and reporting.</CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Users className="w-6 h-6 text-primary" /> Roles</CardTitle>
              <CardDescription>Trader, Support, Admin</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-300">Access controls and approvals.</CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Building2 className="w-6 h-6 text-primary" /> Desk</CardTitle>
              <CardDescription>Private desk and concierge</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-300">Bespoke execution and liquidity.</CardContent>
          </Card>
        </div>

        <div className="mt-8 p-6 rounded-3xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="secondary">ADMIN</Badge>
            <span className="text-xs text-gray-400">Restricted functions</span>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div className="flex items-center gap-3"><Lock className="w-5 h-5" /> MFA approvals for high-value operations</div>
            <div className="flex items-center gap-3"><Lock className="w-5 h-5" /> Comprehensive audit logging</div>
          </div>
          <div className="mt-6">
            <Button>Contact Desk</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
