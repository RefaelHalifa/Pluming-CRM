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
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Customer } from '../types';
import { Plus, Search, Phone, Mail, MapPin, Trash2, Edit2, History } from 'lucide-react';
import { motion } from 'motion/react';

export default function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'customers'), {
        ...newCustomer,
        createdAt: serverTimestamp()
      });
      setNewCustomer({ name: '', email: '', phone: '', address: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding customer', error);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Customer Database</h2>
          <p className="text-stone-500">Manage your client relationships and history</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
        <input 
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-stone-200 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm"
        >
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              required
              placeholder="Full Name"
              value={newCustomer.name}
              onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
              className="p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
            <input 
              required
              placeholder="Phone Number"
              value={newCustomer.phone}
              onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
              className="p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
            <input 
              type="email"
              placeholder="Email Address"
              value={newCustomer.email}
              onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
              className="p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
            <input 
              placeholder="Service Address"
              value={newCustomer.address}
              onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
              className="p-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
            <div className="md:col-span-2 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
              >
                Save Customer
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <motion.div 
            layout
            key={customer.id}
            className="bg-white p-6 rounded-2xl border border-stone-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-stone-900">{customer.name}</h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteDoc(doc(db, 'customers', customer.id))}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-stone-400" />
                <span>{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-stone-400" />
                  <span>{customer.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-stone-400" />
                <span>{customer.address}</span>
              </div>
            </div>

            <button className="mt-6 w-full py-2 border border-stone-100 rounded-lg text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-all flex items-center justify-center gap-2 text-sm">
              <History className="w-4 h-4" />
              View Service History
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
