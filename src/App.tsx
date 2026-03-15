import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Users, 
  Briefcase, 
  LogOut, 
  User as UserIcon,
  ShieldCheck,
  Menu,
  X,
  Settings,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components (to be implemented in separate files or as sub-components)
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import CustomerManager from './components/CustomerManager';
import WorkerPortal from './components/WorkerPortal';
import SystemSettings from './components/SystemSettings';
import UserManager from './components/UserManager';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'customers' | 'worker' | 'system'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const isAdmin = user?.email?.toLowerCase() === 'rafaelhalifa@gmail.com';
  const effectiveRole: UserRole = profile?.role || (isAdmin ? 'manager' : 'worker');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager'] },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon, roles: ['manager', 'secretary'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['manager', 'secretary'] },
    { id: 'team', label: 'Team', icon: ShieldCheck, roles: ['manager'] },
    { id: 'worker', label: 'My Assignments', icon: Briefcase, roles: ['worker', 'manager'] },
    { id: 'system', label: 'System', icon: Database, roles: ['manager'] },
  ];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Check for custom session
    const savedUser = localStorage.getItem('palmer_crm_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed.user);
      setProfile(parsed.profile);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeoutId);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const docRef = doc(db, 'users', firebaseUser.uid);
          
          // Use onSnapshot for real-time profile updates
          const unsubProfile = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              // Try to find a legacy profile by email
              const legacyId = firebaseUser.email?.replace(/[^a-zA-Z0-9]/g, '_');
              if (legacyId) {
                const legacyRef = doc(db, 'users', legacyId);
                const legacySnap = await getDoc(legacyRef);
                
                if (legacySnap.exists()) {
                  const legacyData = legacySnap.data() as UserProfile;
                  const newProfile: UserProfile = {
                    ...legacyData,
                    uid: firebaseUser.uid, // Update to the real Firebase UID
                  };
                  // Save the migrated profile and delete the legacy one
                  await setDoc(docRef, newProfile);
                  await deleteDoc(legacyRef);
                  setProfile(newProfile);
                  setLoading(false);
                  return;
                }
              }

              const isDefaultManager = firebaseUser.email?.toLowerCase() === 'rafaelhalifa@gmail.com';
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'New User',
                email: firebaseUser.email || '',
                role: isDefaultManager ? 'manager' : 'worker',
              };
              // Set local profile immediately so UI can proceed
              setProfile(newProfile);
              setDoc(docRef, newProfile).catch(err => {
                const errInfo = {
                  error: err instanceof Error ? err.message : String(err),
                  operationType: 'create',
                  path: `users/${firebaseUser.uid}`,
                  authInfo: {
                    userId: firebaseUser.uid,
                    email: firebaseUser.email,
                  }
                };
                console.error("Error creating profile:", JSON.stringify(errInfo));
              });
            }
            setLoading(false);
          }, (error) => {
            const errInfo = {
              error: error instanceof Error ? error.message : String(error),
              operationType: 'get',
              path: `users/${firebaseUser.uid}`,
              authInfo: {
                userId: firebaseUser.uid,
                email: firebaseUser.email,
              }
            };
            console.error("Profile listener error:", JSON.stringify(errInfo));
            
            // If we have a user but profile fails, at least set a fallback for the admin
            if (firebaseUser.email?.toLowerCase() === 'rafaelhalifa@gmail.com') {
              setProfile({
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Admin',
                email: firebaseUser.email,
                role: 'manager'
              });
            }
            setLoading(false);
          });

          return () => unsubProfile();
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth state error:", error);
        setLoading(false);
      }
    });

    // Safety timeout: if auth doesn't respond in 10 seconds, stop loading
    timeoutId = setTimeout(() => {
      console.warn("Auth initialization timed out");
      setLoading(false);
    }, 10000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Ensure active tab is valid for current role
  useEffect(() => {
    if (profile) {
      const currentTabObj = tabs.find(t => t.id === activeTab);
      if (currentTabObj && !currentTabObj.roles.includes(effectiveRole)) {
        const firstValidTab = tabs.find(t => t.roles.includes(effectiveRole));
        if (firstValidTab) setActiveTab(firstValidTab.id as any);
      }
    }
  }, [effectiveRole]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    try {
      if (email && password) {
        if (isSignUp) {
          // Firebase Auth Sign Up
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          // Create Firestore profile for the new user
          const docRef = doc(db, 'users', firebaseUser.uid);
          const isDefaultManager = firebaseUser.email?.toLowerCase() === 'rafaelhalifa@gmail.com';
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: email.split('@')[0], // Default name from email
            email: firebaseUser.email || '',
            role: isDefaultManager ? 'manager' : 'worker',
          };
          await setDoc(docRef, newProfile);
          setUser(firebaseUser);
          setProfile(newProfile);
        } else {
          try {
            // Try Firebase Auth Sign In
            await signInWithEmailAndPassword(auth, email, password);
          } catch (authErr: any) {
            // Fallback to Firestore custom password check (for legacy users)
            const derivedId = email.replace(/[^a-zA-Z0-9]/g, '_');
            const docRef = doc(db, 'users', derivedId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const userData = docSnap.data() as UserProfile;
              if (userData.password === password) {
                const customUser = {
                  uid: userData.uid,
                  email: userData.email,
                  displayName: userData.name
                } as any;
                
                setUser(customUser);
                setProfile(userData);
                localStorage.setItem('palmer_crm_user', JSON.stringify({ user: customUser, profile: userData }));
              } else {
                throw authErr; // Re-throw the original auth error if password mismatch
              }
            } else {
              throw authErr; // Re-throw if no Firestore match either
            }
          }
        }
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      }
    } catch (error: any) {
      console.error('Authentication failed', error);
      let message = error.message || 'Authentication failed';
      if (error.code === 'auth/email-already-in-use') message = 'This email is already registered. Try signing in.';
      if (error.code === 'auth/weak-password') message = 'Password should be at least 6 characters.';
      if (error.code === 'auth/invalid-credential') message = 'Invalid email or password.';
      setAuthError(message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Reset failed', error);
      setAuthError(error.message || 'Failed to send reset email.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('palmer_crm_user');
    signOut(auth);
  };

  const handleSwitchRole = async (newRole: UserRole) => {
    if (!user || effectiveRole !== 'manager' && !isAdmin) return;
    setIsSwitchingRole(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { role: newRole }, { merge: true });
    } catch (error) {
      console.error('Failed to switch role', error);
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mb-6"
        />
        <h2 className="text-xl font-bold text-stone-800 mb-2">Loading Palmer CRM...</h2>
        <p className="text-stone-500 text-center max-w-xs mb-8">
          Connecting to secure services. If this takes too long, try refreshing or opening in a new tab.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
          >
            Refresh Page
          </button>
          <button 
            onClick={() => window.open(window.location.href, '_blank')}
            className="w-full py-3 border border-stone-200 text-stone-600 rounded-xl font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </button>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-black/5"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-stone-900">Palmer CRM</h1>
          <p className="text-stone-500 text-center mb-8 italic font-serif">Precision Plumbing Management</p>
          
          <div className="flex bg-stone-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => { setIsSignUp(false); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${!isSignUp ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsSignUp(true); setAuthError(''); }}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${isSignUp ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase">Email Address</label>
              <input 
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase">Password</label>
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
              />
              {!isSignUp && (
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] font-bold text-stone-400 hover:text-emerald-600 transition-colors uppercase mt-1 ml-1"
                >
                  Forgot Password?
                </button>
              )}
            </div>

            {authError && (
              <p className="text-xs text-red-500 font-medium">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/10"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-400 font-bold">Or continue with</span>
            </div>
          </div>

          <button
            onClick={() => handleLogin()}
            className="w-full py-3 border border-stone-200 text-stone-600 rounded-xl font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Google Login
          </button>

          <div className="mt-8 pt-6 border-t border-stone-100">
            <p className="text-sm font-semibold text-stone-900 text-center mb-2">
              iOS / Safari Login Issues?
            </p>
            <p className="text-xs text-stone-500 text-center mb-4 px-4">
              Safari blocks security cookies in previews. To fix this, open the app directly or copy the link to your browser.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 border border-emerald-100"
              >
                <ExternalLink className="w-4 h-4" />
                1. Open in New Tab
              </button>

              <button
                onClick={copyLink}
                className="w-full py-3 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    2. Copy App Link
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[10px] text-stone-400 text-center mt-4 italic">
              After opening in a new tab, you can sign in normally.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const filteredTabs = tabs.filter(tab => tab.roles.includes(effectiveRole));

  return (
    <div className="h-[100dvh] bg-[#F5F5F0] flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-stone-200 p-4 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <span className="font-bold text-stone-900">Palmer CRM</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-stone-900 text-stone-300 p-6 pb-safe flex flex-col transform transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="hidden md:flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Palmer CRM</span>
            </div>

            <nav className="flex-1 space-y-2">
              {filteredTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}

              {isAdmin && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-4 px-4 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    Role Preview (Dev)
                  </p>
                  <div className="space-y-1">
                    {(['manager', 'secretary', 'worker'] as UserRole[]).map(role => (
                      <button
                        key={role}
                        onClick={() => handleSwitchRole(role)}
                        disabled={isSwitchingRole}
                        className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-xs transition-all ${
                          effectiveRole === role 
                            ? 'bg-white/10 text-white font-bold' 
                            : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="capitalize">{role}</span>
                        {effectiveRole === role && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        {isSwitchingRole && effectiveRole !== role && <RefreshCw className="w-3 h-3 animate-spin opacity-50" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/10">
              <div className="flex items-center gap-3 mb-6 px-2">
                <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center border border-white/10">
                  <UserIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{profile.name}</p>
                  <p className="text-xs text-stone-500 capitalize">{effectiveRole}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-stone-400"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto scrolling-touch">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && effectiveRole === 'manager' && <Dashboard />}
          {activeTab === 'calendar' && (effectiveRole === 'manager' || effectiveRole === 'secretary') && <CalendarView role={effectiveRole} />}
          {activeTab === 'customers' && (effectiveRole === 'manager' || effectiveRole === 'secretary') && <CustomerManager />}
          {activeTab === 'team' && effectiveRole === 'manager' && <UserManager currentUserEmail={user?.email || ''} />}
          {activeTab === 'worker' && <WorkerPortal profile={profile} />}
          {activeTab === 'system' && effectiveRole === 'manager' && <SystemSettings />}
        </div>
      </main>
    </div>
  );
}
