import { db, KYCSubmission } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Check, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function KYCQueue() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);

  useEffect(() => {
    setSubmissions(db.getKYCSubmissions().filter(k => k.status === 'Pending'));
  }, []);

  const handleReview = (id: string, status: 'Approved' | 'Rejected') => {
     const submission = submissions.find(s => s.id === id);
     if (!submission) return;

     // Update submission
     const updated = { ...submission, status };
     db.updateKYCSubmission(updated);

     // Update User
     const users = db.getUsers();
     const user = users.find(u => u.id === submission.user_id);
     if (user) {
        db.updateUser({ ...user, kyc_status: status });
     }

     setSubmissions(prev => prev.filter(s => s.id !== id));
     toast({ 
       title: `KYC ${status}`, 
       description: `User ${user?.name}'s verification has been ${status.toLowerCase()}.` 
     });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">KYC Verification Queue</h1>
        <p className="text-muted-foreground">Review pending identity documents.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No pending submissions.</TableCell>
                 </TableRow>
              )}
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono text-xs">{sub.id}</TableCell>
                  <TableCell>{sub.user_id}</TableCell>
                  <TableCell>{sub.document_type}</TableCell>
                  <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Dialog>
                       <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> View</Button>
                       </DialogTrigger>
                       <DialogContent className="max-w-2xl">
                          <DialogHeader>
                             <DialogTitle>Document Review</DialogTitle>
                          </DialogHeader>
                          <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                             <img src={sub.document_image_url} alt="KYC Doc" className="object-contain w-full h-full" />
                          </div>
                          <div className="flex gap-2 justify-end mt-4">
                             <Button variant="destructive" onClick={() => handleReview(sub.id, 'Rejected')}>Reject</Button>
                             <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReview(sub.id, 'Approved')}>Approve</Button>
                          </div>
                       </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
