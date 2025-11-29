import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { updateUserPayout } from '@/lib/payout'

type Props = {
  userId: string
  initialPct: number
  apiBase: string
  token: string
  onUpdated?: (pct: number) => void
}

export default function PayoutControl({ userId, initialPct, apiBase, token, onUpdated }: Props) {
  const { toast } = useToast()
  const [pct, setPct] = useState<number>(Math.round(initialPct || 0))
  const [reason, setReason] = useState<string>('')
  const save = async () => {
    try {
      const r = await updateUserPayout(apiBase, token, userId, pct, reason)
      setPct(Math.round(r.payoutPct))
      onUpdated?.(Math.round(r.payoutPct))
      toast({ title: 'User Payout Updated', description: `${Math.round(r.payoutPct)}%` })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: String(e?.message || 'Error') })
    }
  }
  return (
    <div className="space-y-2">
      <Label id="label-user-payout">User Payout Percentage</Label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        <div className="md:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground" id="desc-user-payout">Override payout for this user</div>
            <div className="text-sm font-medium" aria-live="polite">{Math.round(pct)}%</div>
          </div>
          <Slider aria-labelledby="label-user-payout" aria-describedby="desc-user-payout" className="touch-manipulation h-12 md:h-8 [&_[data-radix-collection-item]]:h-12 [&_[data-radix-collection-item]]:w-12 md:[&_[data-radix-collection-item]]:h-6 md:[&_[data-radix-collection-item]]:w-6" value={[pct]} onValueChange={(v) => setPct(Math.max(0, Math.min(100, Number(v[0] || 0))))} min={0} max={100} step={1} />
        </div>
        <div className="space-y-1">
          <Input className="h-12" aria-label="Payout percentage" inputMode="numeric" pattern="[0-9]*" placeholder="%" value={String(Math.round(pct))} onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value || 0))))} />
          <Button aria-label="Save user payout" type="button" className="h-12" onClick={save}>Save</Button>
        </div>
      </div>
      <Input aria-label="Reason (optional)" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
    </div>
  )
}
