import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Job, Customer, UserProfile } from '../types';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay } from 'date-fns';
import { 
  Plus, 
  Clock, 
  User, 
  MapPin, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import 'react-day-picker/dist/style.css';

export default function CalendarView({ role }: { role: string }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<UserProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newJob, setNewJob] = useState({
    customerId: '',
    workerId: '',
    description: '',
    amount: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => {
        const data = doc.data();
        let jobDate: Date;
        
        if (data.date instanceof Timestamp) {
          jobDate = data.date.toDate();
        } else if (typeof data.date === 'string') {
          jobDate = new Date(data.date);
        } else {
          jobDate = new Date();
        }

        return { 
          id: doc.id, 
          ...data, 
          date: jobDate 
        } as any;
      }));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    const unsubWorkers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)).filter(u => u.role === 'worker'));
    });

    return () => {
      unsubscribe();
      unsubCustomers();
      unsubWorkers();
    };
  }, []);

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === newJob.customerId);
    const worker = workers.find(w => w.uid === newJob.workerId);
    
    try {
      await addDoc(collection(db, 'jobs'), {
        ...newJob,
        customerName: customer?.name || 'Unknown',
        workerName: worker?.name || 'Unassigned',
        date: Timestamp.fromDate(selectedDate),
        status: 'scheduled',
        paymentStatus: 'unpaid',
        createdAt: serverTimestamp()
      });
      setNewJob({ customerId: '', workerId: '', description: '', amount: 0 });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding job', error);
    }
  };

  const selectedDayJobs = jobs.filter(job => isSameDay(job.date, selectedDate));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Calendar Section */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900 mb-4">Work Calendar</h2>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="mx-auto"
            modifiers={{
              hasJob: jobs.map(j => j.date)
            }}
            modifiersStyles={{
              hasJob: { fontWeight: 'bold', color: '#10b981', textDecoration: 'underline' }
            }}
          />
        </div>

        <div className="bg-stone-900 text-white p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold mb-2">Daily Summary</h3>
          <p className="text-stone-400 text-sm mb-4">{format(selectedDate, 'MMMM do, yyyy')}</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{selectedDayJobs.length}</p>
              <p className="text-xs text-stone-500 uppercase tracking-wider">Scheduled Works</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-emerald-400">
                ${selectedDayJobs.reduce((acc, curr) => acc + (curr.amount || 0), 0)}
              </p>
              <p className="text-xs text-stone-500 uppercase tracking-wider">Potential Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs List Section */}
      <div className="lg:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Assignments</h2>
            <p className="text-stone-500">Manage jobs for {format(selectedDate, 'MMM d')}</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Job
          </button>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl border-2 border-emerald-500/20 shadow-xl"
            >
              <form onSubmit={handleAddJob} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase">Customer</label>
                    <select 
                      required
                      value={newJob.customerId}
                      onChange={e => setNewJob({...newJob, customerId: e.target.value})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-emerald-500"
                    >
                      <option value="">Select Customer</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase">Assign Worker</label>
                    <select 
                      value={newJob.workerId}
                      onChange={e => setNewJob({...newJob, workerId: e.target.value})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-emerald-500"
                    >
                      <option value="">Unassigned</option>
                      {workers.map(w => (
                        <option key={w.uid} value={w.uid}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase">Job Description</label>
                  <textarea 
                    required
                    placeholder="What needs to be done?"
                    value={newJob.description}
                    onChange={e => setNewJob({...newJob, description: e.target.value})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-emerald-500 h-24"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-stone-400" />
                    <input 
                      type="number"
                      placeholder="Amount"
                      value={newJob.amount}
                      onChange={e => setNewJob({...newJob, amount: Number(e.target.value)})}
                      className="w-32 p-3 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-stone-500">Cancel</button>
                    <button type="submit" className="px-8 py-2 bg-emerald-600 text-white rounded-lg font-bold">Schedule Job</button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {selectedDayJobs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400">
              <Clock className="w-12 h-12 mb-4 opacity-20" />
              <p>No jobs scheduled for this day</p>
            </div>
          ) : (
            selectedDayJobs.map(job => (
              <motion.div 
                layout
                key={job.id}
                className="bg-white p-6 rounded-2xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-6 group"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      job.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {job.status}
                    </span>
                    <h3 className="font-bold text-stone-900">{job.customerName}</h3>
                  </div>
                  <p className="text-stone-600 text-sm line-clamp-2">{job.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-stone-400">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{job.workerName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="font-bold text-stone-700">${job.amount}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${job.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {job.paymentStatus === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      <span className="capitalize">{job.paymentStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => updateDoc(doc(db, 'jobs', job.id), { paymentStatus: job.paymentStatus === 'paid' ? 'unpaid' : 'paid' })}
                    className={`p-2 rounded-lg transition-colors ${job.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-50 text-stone-400 hover:text-emerald-600'}`}
                    title="Toggle Payment"
                  >
                    <DollarSign className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => deleteDoc(doc(db, 'jobs', job.id))}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
