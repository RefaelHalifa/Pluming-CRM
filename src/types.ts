export type UserRole = 'manager' | 'secretary' | 'worker';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  createdAt: any;
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  workerId?: string;
  workerName?: string;
  date: any; // Timestamp
  description: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  workerSummary?: string;
  isSuccess?: boolean;
  paymentStatus: 'unpaid' | 'paid' | 'partial';
  amount: number;
  secretaryNotes?: string;
}
