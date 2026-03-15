import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { 
  UserPlus, 
  Search, 
  Mail, 
  Shield, 
  Trash2, 
  UserCheck,
  AlertTriangle,
  Loader2,
  Lock,
  Edit2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserManager({ currentUserEmail }: { currentUserEmail: string }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'worker' as UserRole,
    password: '',
    uid: '' // Manual UID for simple login tracking if needed
  });

  const isSuperAdmin = currentUserEmail.toLowerCase() === 'rafaelhalifa@gmail.com';

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('email', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uid = newUser.uid || newUser.email.replace(/[^a-zA-Z0-9]/g, '_');
      
      if (newUser.role === 'manager' && !isSuperAdmin) {
        alert('Only the primary administrator can create new managers.');
        setLoading(false);
        return;
      }

      await setDoc(doc(db, 'users', uid), {
        uid,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        password: newUser.password
      });

      setNewUser({ name: '', email: '', role: 'worker', password: '', uid: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding user', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      if (editingUser.role === 'manager' && !isSuperAdmin && users.find(u => u.uid === editingUser.uid)?.role !== 'manager') {
        alert('Only the primary administrator can promote users to manager.');
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'users', editingUser.uid), {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        password: editingUser.password || ''
      });

      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string, email: string) => {
    if (email.toLowerCase() === 'rafaelhalifa@gmail.com') {
      alert('The primary administrator account cannot be deleted.');
      return;
    }
    if (!confirm('Are you sure you want to remove this user profile?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error('Error deleting user', error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">User Management</h2>
          <p className="text-stone-500 text-sm">Manage access for secretaries and workers</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-lg shadow-stone-900/10"
        >
          <UserPlus className="w-5 h-5" />
          Add Team Member
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input 
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl outline-none focus:border-emerald-500 transition-all shadow-sm"
        />
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-2xl border-2 border-emerald-500/20 shadow-xl"
          >
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Full Name</label>
                  <input 
                    required
                    type="text"
                    placeholder="John Doe"
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Email Address</label>
                  <input 
                    required
                    type="email"
                    placeholder="john@palmer.com"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Password</label>
                  <input 
                    type="text"
                    placeholder="Optional"
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Role</label>
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                  >
                    <option value="worker">Worker</option>
                    <option value="secretary">Secretary</option>
                    {isSuperAdmin && <option value="manager">Manager</option>}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] text-stone-400 italic">
                  Note: Team members must still create an account with this email to sign in.
                </p>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)} 
                    className="px-6 py-2 text-stone-500 font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-8 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    Create Profile
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Team Member</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map(user => (
                <tr key={user.uid} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{user.name}</p>
                        <div className="flex items-center gap-1 text-xs text-stone-400">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'secretary' ? 'bg-blue-100 text-blue-700' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.email.toLowerCase() === 'rafaelhalifa@gmail.com' ? (
                        <div className="flex items-center justify-end gap-2 text-stone-300">
                          <Lock className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">Protected</span>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => setEditingUser(user)}
                            className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.uid, user.email)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Edit Team Member</h3>
                  <p className="text-xs text-stone-500">Update profile and access credentials</p>
                </div>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Full Name</label>
                    <input 
                      required
                      type="text"
                      value={editingUser.name}
                      onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Email Address (Login ID)</label>
                    <input 
                      required
                      type="email"
                      value={editingUser.email}
                      onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Role / Access Level</label>
                    <select 
                      value={editingUser.role}
                      onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    >
                      <option value="worker">Worker</option>
                      <option value="secretary">Secretary</option>
                      {isSuperAdmin && <option value="manager">Manager</option>}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Password (For Non-Google Login)</label>
                    <input 
                      type="text"
                      value={editingUser.password || ''}
                      onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Note:</strong> To enable Email/Password login for this user, they must <strong>Sign Up</strong> on the login screen using this email and password. 
                      Once they sign up, their profile will be automatically linked to their new secure account.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)} 
                    className="flex-1 py-3 text-stone-500 font-bold hover:bg-stone-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
