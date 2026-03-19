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
import { db, auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { UserProfile, UserRole, Language } from '../types';
import { translations } from '../translations';
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
  X,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function UserManager({ currentUserEmail, language }: { currentUserEmail: string, language: Language }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ uid: string, email: string } | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'worker' as UserRole,
    password: '',
    uid: '' // Manual UID for simple login tracking if needed
  });

  const t = translations[language];
  const isRTL = language === 'he';
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
    setError(null);
    try {
      const cleanEmail = newUser.email.trim().toLowerCase();
      const cleanPassword = newUser.password.trim();
      const uid = newUser.uid || cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      
      if (newUser.role === 'manager' && !isSuperAdmin) {
        setError(t.adminOnly);
        setLoading(false);
        return;
      }

      if (cleanPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }

      await setDoc(doc(db, 'users', uid), {
        uid,
        name: newUser.name,
        email: cleanEmail,
        role: newUser.role,
        password: cleanPassword,
        language: language
      });

      setNewUser({ name: '', email: '', role: 'worker', password: '', uid: '' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    setError(null);
    try {
      if (editingUser.role === 'manager' && !isSuperAdmin && users.find(u => u.uid === editingUser.uid)?.role !== 'manager') {
        setError(t.adminOnly);
        setLoading(false);
        return;
      }

      if (editingUser.password && editingUser.password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }

      const cleanEmail = editingUser.email.trim().toLowerCase();
      const cleanPassword = editingUser.password ? editingUser.password.trim() : '';

      if (cleanPassword && cleanPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'users', editingUser.uid), {
        name: editingUser.name,
        email: cleanEmail,
        role: editingUser.role,
        password: cleanPassword
      });

      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string, email: string) => {
    if (email.toLowerCase() === 'rafaelhalifa@gmail.com') {
      setError(t.adminOnly);
      return;
    }
    setDeleteConfirm({ uid, email });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'users', deleteConfirm.uid));
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${deleteConfirm.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset email sent to ${email}`);
    } catch (error: any) {
      console.error('Failed to send reset email', error);
      setError(error.message || 'Failed to send reset email.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 mb-6"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">{t.userManagement}</h2>
          <p className="text-stone-500 text-sm">{t.manageTeam}</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-lg shadow-stone-900/10"
        >
          <UserPlus className="w-5 h-5" />
          {t.addTeamMember}
        </button>
      </div>

      <div className="relative">
        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400`} />
        <input 
          type="text"
          placeholder={t.searchUsers}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-white border border-stone-200 rounded-2xl outline-none focus:border-emerald-500 transition-all shadow-sm`}
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
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t.fullName}</label>
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
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t.emailAddress}</label>
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
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t.password}</label>
                  <input 
                    required
                    type="text"
                    placeholder="Required"
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t.role}</label>
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                  >
                    <option value="worker">{t.worker}</option>
                    <option value="secretary">{t.secretary}</option>
                    {isSuperAdmin && <option value="manager">{t.manager}</option>}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)} 
                    className="px-6 py-2 text-stone-500 font-medium"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-8 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    {t.createProfile}
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
                <th className={`px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>{t.teamMember}</th>
                <th className={`px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>{t.role}</th>
                <th className={`px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest ${isRTL ? 'text-left' : 'text-right'}`}>{t.actions}</th>
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
                      {t[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'} gap-2`}>
                      {user.email.toLowerCase() === 'rafaelhalifa@gmail.com' ? (
                        <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'} gap-2 text-stone-300`}>
                          <Lock className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">{t.protected}</span>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleSendResetEmail(user.email)}
                            className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Send Reset Password Email"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">{t.confirmDelete}</h3>
              <p className="text-stone-500 text-sm mb-8">
                {deleteConfirm.email}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 text-stone-500 font-bold hover:bg-stone-50 rounded-xl transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{t.editTeamMember}</h3>
                  <p className="text-xs text-stone-500">{t.manageTeam}</p>
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
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t.fullName}</label>
                    <input 
                      required
                      type="text"
                      value={editingUser.name}
                      onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t.emailAddress}</label>
                    <input 
                      required
                      type="email"
                      value={editingUser.email}
                      onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t.role}</label>
                    <select 
                      value={editingUser.role}
                      onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    >
                      <option value="worker">{t.worker}</option>
                      <option value="secretary">{t.secretary}</option>
                      {isSuperAdmin && <option value="manager">{t.manager}</option>}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t.password}</label>
                    <input 
                      type="text"
                      value={editingUser.password || ''}
                      onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)} 
                    className="flex-1 py-3 text-stone-500 font-bold hover:bg-stone-50 rounded-xl transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    {t.saveChanges}
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
