import { db, User, Role, KYCStatus, MembershipTier } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { Search, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    db.updateUser(selectedUser);
    setUsers(db.getUsers()); // Refresh
    setSelectedUser(null);
    toast({ title: 'User Updated', description: 'User details saved successfully.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <div className="relative w-64">
           <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input 
             placeholder="Search users..." 
             className="pl-8" 
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                     <Badge variant={user.kyc_status === 'Approved' ? 'default' : 'outline'}>
                        {user.kyc_status}
                     </Badge>
                  </TableCell>
                  <TableCell>{user.membership_tier}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      {selectedUser && selectedUser.id === user.id && (
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User: {user.name}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleUpdateUser} className="space-y-4 py-4">
                             <div className="space-y-2">
                                <Label>Role</Label>
                                <Select 
                                  value={selectedUser.role} 
                                  onValueChange={(val: Role) => setSelectedUser({...selectedUser, role: val})}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Trader">Trader</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Customer Service">Customer Service</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <Label>KYC Status</Label>
                                <Select 
                                  value={selectedUser.kyc_status} 
                                  onValueChange={(val: KYCStatus) => setSelectedUser({...selectedUser, kyc_status: val})}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Not Started">Not Started</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <Label>Membership Tier</Label>
                                <Select 
                                  value={selectedUser.membership_tier} 
                                  onValueChange={(val: MembershipTier) => setSelectedUser({...selectedUser, membership_tier: val})}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Bronze">Bronze</SelectItem>
                                    <SelectItem value="Silver">Silver</SelectItem>
                                    <SelectItem value="Gold">Gold</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                             <Button type="submit" className="w-full">Save Changes</Button>
                          </form>
                        </DialogContent>
                      )}
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
