// --- Types ---

export type Role = 'Trader' | 'Customer Service' | 'Admin';
export type KYCStatus = 'Not Started' | 'Pending' | 'Approved' | 'Rejected';
export type MembershipTier = 'Bronze' | 'Silver' | 'Gold';
export type TransactionType = 'Deposit' | 'Withdrawal' | 'Manual';
export type TransactionStatus = 'Pending' | 'Approved' | 'Rejected';
export type TradeDirection = 'High' | 'Low';
export type TradeResult = 'Win' | 'Loss' | 'Pending';
export type TradeStatus = 'Open' | 'Closed';
export type TicketStatus = 'Open' | 'Closed';
export type DocType = 'ID' | 'Proof of Address';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  kyc_status: KYCStatus;
  membership_tier: MembershipTier;
  password?: string; // Mock only
}

export interface Wallet {
  id: string;
  user_id: string;
  asset_name: string;
  balance: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  asset: string;
  amount: number;
  status: TransactionStatus;
  created_at: string; // ISO Date
  wallet_address?: string; // For withdrawals
}

export interface Trade {
  id: string;
  user_id: string;
  asset: string;
  amount: number;
  direction: TradeDirection;
  duration: string;
  entry_price: number;
  exit_price?: number;
  result: TradeResult;
  status: TradeStatus;
  created_at: string;
}

export interface KYCSubmission {
  id: string;
  user_id: string;
  document_type: DocType;
  document_image_url: string;
  status: KYCStatus;
  admin_notes?: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  cs_agent_id?: string;
  created_at: string;
}

// --- Initial Data ---

const MOCK_USERS: User[] = [
  { id: '1', email: 'trader@binapex.com', name: 'John Trader', role: 'Trader', kyc_status: 'Approved', membership_tier: 'Gold', password: 'password' },
  { id: '2', email: 'admin@binapex.com', name: 'Super Admin', role: 'Admin', kyc_status: 'Approved', membership_tier: 'Gold', password: 'password' },
  { id: '3', email: 'support@binapex.com', name: 'Agent Smith', role: 'Customer Service', kyc_status: 'Approved', membership_tier: 'Silver', password: 'password' },
  { id: '4', email: 'newbie@binapex.com', name: 'New User', role: 'Trader', kyc_status: 'Not Started', membership_tier: 'Bronze', password: 'password' },
];

const MOCK_WALLETS: Wallet[] = [
  { id: '1', user_id: '1', asset_name: 'BTC', balance: 1.5 },
  { id: '2', user_id: '1', asset_name: 'USD', balance: 25000 },
  { id: '3', user_id: '4', asset_name: 'USD', balance: 100 },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', user_id: '1', type: 'Deposit', asset: 'USD', amount: 10000, status: 'Approved', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', user_id: '1', type: 'Withdrawal', asset: 'BTC', amount: 0.1, status: 'Pending', created_at: new Date().toISOString(), wallet_address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
];

const MOCK_TRADES: Trade[] = [
  { id: '1', user_id: '1', asset: 'BTC/USD', amount: 500, direction: 'High', duration: '5M', entry_price: 50000, exit_price: 50100, result: 'Win', status: 'Closed', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', user_id: '1', asset: 'ETH/USD', amount: 200, direction: 'Low', duration: '1M', entry_price: 3000, exit_price: 3010, result: 'Loss', status: 'Closed', created_at: new Date(Date.now() - 1800000).toISOString() },
];

const MOCK_KYC: KYCSubmission[] = [
  { id: '1', user_id: '4', document_type: 'ID', document_image_url: 'https://placehold.co/400x600/png?text=ID+Document', status: 'Pending', created_at: new Date().toISOString() },
];

const MOCK_TICKETS: SupportTicket[] = [
  { id: '1', user_id: '1', subject: 'Deposit Issue', message: 'My deposit is delayed.', status: 'Open', created_at: new Date().toISOString() },
];

class MockDatabase {
  private get<T>(key: string, initial: T): T {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initial;
  }

  private set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Users
  getUsers() { return this.get<User[]>('users', MOCK_USERS); }
  updateUser(user: User) {
    const users = this.getUsers().map(u => u.id === user.id ? user : u);
    this.set('users', users);
  }
  addUser(user: User) {
    const users = this.getUsers();
    this.set('users', [...users, user]);
  }

  // Wallets
  getWallets() { return this.get<Wallet[]>('wallets', MOCK_WALLETS); }
  getUserWallets(userId: string) { return this.getWallets().filter(w => w.user_id === userId); }
  updateWallet(wallet: Wallet) {
    const wallets = this.getWallets().map(w => w.id === wallet.id ? wallet : w);
    this.set('wallets', wallets);
  }

  // Transactions
  getTransactions() { return this.get<Transaction[]>('transactions', MOCK_TRANSACTIONS); }
  getUserTransactions(userId: string) { return this.getTransactions().filter(t => t.user_id === userId); }
  addTransaction(tx: Transaction) {
    const txs = this.getTransactions();
    this.set('transactions', [tx, ...txs]);
  }
  updateTransaction(tx: Transaction) {
    const txs = this.getTransactions().map(t => t.id === tx.id ? tx : t);
    this.set('transactions', txs);
  }

  // Trades
  getTrades() { return this.get<Trade[]>('trades', MOCK_TRADES); }
  getUserTrades(userId: string) { return this.getTrades().filter(t => t.user_id === userId); }
  addTrade(trade: Trade) {
    const trades = this.getTrades();
    this.set('trades', [trade, ...trades]);
  }

  // KYC
  getKYCSubmissions() { return this.get<KYCSubmission[]>('kyc', MOCK_KYC); }
  addKYCSubmission(kyc: KYCSubmission) {
    const list = this.getKYCSubmissions();
    this.set('kyc', [kyc, ...list]);
  }
  updateKYCSubmission(kyc: KYCSubmission) {
    const list = this.getKYCSubmissions().map(k => k.id === kyc.id ? kyc : k);
    this.set('kyc', list);
  }

  // Tickets
  getTickets() { return this.get<SupportTicket[]>('tickets', MOCK_TICKETS); }
  addTicket(ticket: SupportTicket) {
    const list = this.getTickets();
    this.set('tickets', [ticket, ...list]);
  }
  updateTicket(ticket: SupportTicket) {
    const list = this.getTickets().map(t => t.id === ticket.id ? ticket : t);
    this.set('tickets', list);
  }
  
  // Reset
  reset() {
    localStorage.clear();
    window.location.reload();
  }
}

export const db = new MockDatabase();
