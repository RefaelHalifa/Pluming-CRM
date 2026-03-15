import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Job, Customer } from '../types';
import { 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const unsubJobs = onSnapshot(collection(db, 'jobs'), (snapshot) => {
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

    return () => {
      unsubJobs();
      unsubCustomers();
    };
  }, []);

  const totalRevenue = jobs.filter(j => j.paymentStatus === 'paid').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const pendingRevenue = jobs.filter(j => j.paymentStatus === 'unpaid').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const activeJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'in-progress').length;

  // Chart Data: Revenue by month
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthJobs = jobs.filter(j => isWithinInterval(j.date, { start, end }));
    const revenue = monthJobs.filter(j => j.paymentStatus === 'paid').reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return {
      name: format(date, 'MMM'),
      revenue
    };
  }).reverse();

  const stats = [
    { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'emerald', trend: '+12%' },
    { label: 'Active Jobs', value: activeJobs, icon: Clock, color: 'blue', trend: '+5%' },
    { label: 'Total Customers', value: customers.length, icon: Users, color: 'stone', trend: '+2' },
    { label: 'Pending Payments', value: `$${pendingRevenue.toLocaleString()}`, icon: AlertCircle, color: 'amber', trend: '-3%' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Executive Overview</h2>
        <p className="text-stone-500">Real-time performance metrics for Palmer Plumbing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                {stat.trend}
                {stat.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </div>
            </div>
            <p className="text-stone-500 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-stone-900">Revenue Performance</h3>
            <select className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1 text-sm outline-none">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last6Months}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6">Recent Successes</h3>
          <div className="space-y-6">
            {jobs.filter(j => j.status === 'completed').slice(0, 5).map(job => (
              <div key={job.id} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-900 truncate">{job.customerName}</p>
                  <p className="text-xs text-stone-500 truncate">{job.workerName} • {format(job.date, 'MMM d')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">+${job.amount}</p>
                  <p className="text-[10px] text-stone-400 uppercase font-bold">Paid</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-sm font-bold text-stone-500 hover:text-stone-900 border-t border-stone-100 transition-colors">
            View All Transactions
          </button>
        </div>
      </div>
    </div>
  );
}
