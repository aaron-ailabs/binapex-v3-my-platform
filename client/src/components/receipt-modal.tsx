import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Transaction } from '@/lib/mock-data';
import { CheckCircle2, Printer } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptModal({ transaction, open, onOpenChange }: ReceiptModalProps) {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Transaction Receipt</DialogTitle>
          <DialogDescription className="text-center">
            {transaction.id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-6 space-y-4 print:py-0">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground">
              ${transaction.amount.toFixed(2)}
            </h3>
            <p className="text-sm text-muted-foreground">Successfully Processed</p>
          </div>
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{new Date(transaction.created_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{transaction.type}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Method</span>
            <span className="font-medium">{transaction.asset}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Destination</span>
            <span className="font-medium truncate max-w-[200px]">{transaction.wallet_address}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{transaction.status}</span>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-4 print:hidden">
          <Button variant="outline" className="w-full" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
