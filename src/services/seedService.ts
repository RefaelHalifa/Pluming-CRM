import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

export const seedSampleData = async () => {
  try {
    // 1. Seed Customers
    const customers = [
      { name: 'John Smith', phone: '555-0101', email: 'john@example.com', address: '123 Main St, Springfield', createdAt: serverTimestamp() },
      { name: 'Sarah Johnson', phone: '555-0102', email: 'sarah@example.com', address: '456 Oak Ave, Springfield', createdAt: serverTimestamp() },
      { name: 'Michael Brown', phone: '555-0103', email: 'michael@example.com', address: '789 Pine Rd, Springfield', createdAt: serverTimestamp() },
    ];

    const customerRefs = [];
    for (const customer of customers) {
      const docRef = await addDoc(collection(db, 'customers'), customer);
      customerRefs.push({ id: docRef.id, name: customer.name });
    }

    // 2. Seed Workers (as profiles, though they need real UIDs to login, we can create dummy ones for UI testing)
    const workers = [
      { uid: 'worker_1', name: 'Dave Plumber', email: 'dave@palmer.com', role: 'worker', password: 'password123' },
      { uid: 'worker_2', name: 'Steve Pipes', email: 'steve@palmer.com', role: 'worker', password: 'password123' },
    ];

    for (const worker of workers) {
      await setDoc(doc(db, 'users', worker.uid), worker);
    }

    // 3. Seed Jobs
    const jobs = [
      {
        customerId: customerRefs[0].id,
        customerName: customerRefs[0].name,
        workerId: 'worker_1',
        workerName: 'Dave Plumber',
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        description: 'Leaking kitchen sink faucet replacement',
        status: 'scheduled',
        paymentStatus: 'unpaid',
        amount: 150
      },
      {
        customerId: customerRefs[1].id,
        customerName: customerRefs[1].name,
        workerId: 'worker_2',
        workerName: 'Steve Pipes',
        date: new Date().toISOString(), // Today
        description: 'Toilet backup in master bathroom',
        status: 'in-progress',
        paymentStatus: 'unpaid',
        amount: 220
      },
      {
        customerId: customerRefs[2].id,
        customerName: customerRefs[2].name,
        workerId: 'worker_1',
        workerName: 'Dave Plumber',
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        description: 'Water heater inspection',
        status: 'completed',
        workerSummary: 'Heater is old but functioning. Recommended replacement in 6 months.',
        isSuccess: true,
        paymentStatus: 'paid',
        amount: 85
      }
    ];

    for (const job of jobs) {
      await addDoc(collection(db, 'jobs'), job);
    }

    return true;
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
};
