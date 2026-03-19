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
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole, Language } from './types';
import { translations } from './translations';
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
  Database,
  Globe
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
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('palmer_language') as Language;
      return saved || 'en';
    }
    return 'en';
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'customers' | 'team' | 'worker' | 'system'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showLoginTips, setShowLoginTips] = useState(false);

  const t = (translations as any)[language];
  const isRTL = language === 'he';

  const toggleLanguage = async () => {
    const newLang: Language = language === 'en' ? 'he' : 'en';
    setLanguage(newLang);
    localStorage.setItem('palmer_language', newLang);
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { language: newLang });
      } catch (err) {
        console.error("Failed to save language preference", err);
        // Revert if failed
        setLanguage(language);
        localStorage.setItem('palmer_language', language);
      }
    }
  };

  const isAdmin = user?.email?.toLowerCase() === 'rafaelhalifa@gmail.com';
  const effectiveRole: UserRole = profile?.role || (isAdmin ? 'manager' : 'worker');

  const tabs = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, roles: ['manager'] },
    { id: 'calendar', label: t.calendar, icon: CalendarIcon, roles: ['manager', 'secretary'] },
    { id: 'customers', label: t.customers, icon: Users, roles: ['manager', 'secretary'] },
    { id: 'team', label: t.team, icon: ShieldCheck, roles: ['manager'] },
    { id: 'worker', label: t.myAssignments, icon: Briefcase, roles: ['worker', 'manager'] },
    { id: 'system', label: t.system, icon: Database, roles: ['manager'] },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    }, (err) => {
      console.error("Auth error:", err);
      setError("Failed to connect to authentication service.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const docRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      try {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          // Sync language from Firestore if it exists and is different from current state
          // Use functional update to avoid stale closure of 'language'
          // Only sync if there are no pending local writes to avoid race conditions
          if (data.language && !docSnap.metadata.hasPendingWrites) {
            setLanguage(prev => {
              if (data.language !== prev) {
                localStorage.setItem('palmer_language', data.language as Language);
                return data.language as Language;
              }
              return prev;
            });
          }
          setLoading(false);
        } else {
          const legacyId = user.email?.replace(/[^a-zA-Z0-9]/g, '_');
          if (legacyId) {
            const legacyRef = doc(db, 'users', legacyId);
            const legacySnap = await getDoc(legacyRef);
            
            if (legacySnap.exists()) {
              const legacyData = legacySnap.data() as UserProfile;
              const newProfile: UserProfile = {
                ...legacyData,
                uid: user.uid,
                role: user.email?.toLowerCase() === 'rafaelhalifa@gmail.com' ? 'manager' : (legacyData.role || 'worker')
              };
              await setDoc(docRef, newProfile);
              await deleteDoc(legacyRef);
              setProfile(newProfile);
              setLoading(false);
              return;
            }
          }

          const isDefaultManager = user.email?.toLowerCase() === 'rafaelhalifa@gmail.com';
          const newProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'New User',
            email: user.email || '',
            role: isDefaultManager ? 'manager' : 'worker',
            language: language
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
          setLoading(false);
        }
      } catch (err) {
        console.error("Profile error:", err);
        // Fallback for admin
        if (user.email?.toLowerCase() === 'rafaelhalifa@gmail.com') {
          setProfile({
            uid: user.uid,
            name: user.displayName || 'Admin',
            email: user.email || '',
            role: 'manager'
          });
        } else {
          setError("Failed to load user profile.");
        }
        setLoading(false);
      }
    }, (err) => {
      console.error("Profile error:", err);
      // Fallback for admin if firestore is blocked
      if (user.email?.toLowerCase() === 'rafaelhalifa@gmail.com') {
        setProfile({
          uid: user.uid,
          name: user.displayName || 'Admin',
          email: user.email || '',
          role: 'manager'
        });
      } else {
        setError("Failed to load user profile. Please check your connection.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
  const [authError, setAuthError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAuthenticating) return;
    
    setAuthError('');
    setIsAuthenticating(true);
    try {
      if (email && password) {
        try {
          // Try Firebase Auth Sign In
          await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          // Fallback to Firestore custom password check (for users added by manager)
          // This is the "best system" for it - bridge manager-added users to Firebase Auth
          const derivedId = email.replace(/[^a-zA-Z0-9]/g, '_');
          const docRef = doc(db, 'users', derivedId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            if (userData.password === password) {
              // Automatically create a real Firebase Auth account for them
              try {
                await createUserWithEmailAndPassword(auth, email, password);
                // The onAuthStateChanged will handle the rest
              } catch (createErr: any) {
                // If account already exists but sign-in failed (maybe password mismatch in Auth)
                throw authErr;
              }
            } else {
              throw authErr; 
            }
          } else {
            throw authErr; 
          }
        }
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      }
    } catch (error: any) {
      console.error('Authentication failed', error);
      let message = t.error;
      if (error.code === 'auth/invalid-credential') message = t.invalidCredentials;
      if (error.code === 'auth/user-not-found') message = t.userNotFound;
      if (error.code === 'auth/wrong-password') message = t.wrongPassword;
      if (error.code === 'auth/too-many-requests') message = t.tooManyRequests;
      setAuthError(message);
    } finally {
      setIsAuthenticating(false);
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
        <h2 className="text-xl font-bold text-stone-800 mb-2">{t.loading}</h2>
        {error ? (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-600 text-sm mb-6 max-w-xs text-center">
            {error}
          </div>
        ) : (
          <p className="text-stone-500 text-center max-w-xs mb-8">
            {t.connecting}
          </p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
          >
            {t.refresh}
          </button>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0] p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-black/5 relative"
        >
          <button 
            onClick={toggleLanguage}
            className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 hover:bg-stone-100 rounded-full transition-colors flex items-center gap-2 text-xs font-bold text-stone-600`}
          >
            <Globe className="w-4 h-4" />
            {language === 'en' ? 'עברית' : 'English'}
          </button>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-stone-900">Palmer CRM</h1>
          <p className="text-stone-500 text-center mb-8 italic font-serif">{t.precisionPlumbing}</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase">{t.emailAddress}</label>
              <input 
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase">{t.password}</label>
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
              />
              <button 
                type="button"
                onClick={handleForgotPassword}
                className={`text-[10px] font-bold text-stone-400 hover:text-emerald-600 transition-colors uppercase mt-1 ${isRTL ? 'mr-1' : 'ml-1'}`}
              >
                {t.forgotPassword}
              </button>
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className={`w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-900/10 flex items-center justify-center gap-2 ${isAuthenticating ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isAuthenticating && <RefreshCw className="w-4 h-4 animate-spin" />}
              {t.signIn}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setShowLoginTips(!showLoginTips)}
              className="text-[10px] font-bold text-stone-400 hover:text-emerald-600 transition-colors uppercase flex items-center justify-center gap-1 mx-auto"
            >
              <ExternalLink className="w-3 h-3" />
              {t.loginIssues}
            </button>
            {showLoginTips && (
              <div className="mt-4 p-4 bg-stone-50 border border-stone-100 rounded-xl text-[10px] text-stone-500 text-left leading-relaxed">
                <p className="font-bold mb-2 text-stone-700">{t.proTip}</p>
                <p>{t.safariFix}</p>
              </div>
            )}
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-400 font-bold">{t.orContinueWith}</span>
            </div>
          </div>

          <button
            onClick={() => handleLogin()}
            disabled={isAuthenticating}
            className={`w-full py-3 border border-stone-200 text-stone-600 rounded-xl font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-3 ${isAuthenticating ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            {t.googleLogin}
          </button>
        </motion.div>
      </div>
    );
  }

  const filteredTabs = tabs.filter(tab => tab.roles.includes(effectiveRole));

  return (
    <div className="h-[100dvh] bg-[#F5F5F0] flex flex-col md:flex-row overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-stone-200 p-4 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <span className="font-bold text-stone-900">Palmer CRM</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleLanguage}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <Globe className="w-5 h-5 text-stone-600" />
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: isRTL ? 300 : -300 }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? 300 : -300 }}
            className={`fixed md:static inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-stone-900 text-stone-300 p-6 pb-safe flex flex-col transform transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`}
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

              <button 
                onClick={toggleLanguage}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all text-stone-400"
              >
                <Globe className="w-5 h-5" />
                <span className="font-medium">{language === 'en' ? 'עברית' : 'English'}</span>
              </button>

              {isAdmin && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-4 px-4 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    {t.rolePreview}
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
                        <span className="capitalize">{t[role]}</span>
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
                  <p className="text-xs text-stone-500 capitalize">{t[effectiveRole]}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-stone-400"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{t.signOut}</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto scrolling-touch">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && effectiveRole === 'manager' && <Dashboard language={language} />}
          {activeTab === 'calendar' && (effectiveRole === 'manager' || effectiveRole === 'secretary') && <CalendarView role={effectiveRole} language={language} />}
          {activeTab === 'customers' && (effectiveRole === 'manager' || effectiveRole === 'secretary') && <CustomerManager language={language} />}
          {activeTab === 'team' && effectiveRole === 'manager' && <UserManager currentUserEmail={user?.email || ''} language={language} />}
          {activeTab === 'worker' && <WorkerPortal profile={profile} language={language} />}
          {activeTab === 'system' && effectiveRole === 'manager' && <SystemSettings language={language} />}
        </div>
      </main>
    </div>
  );
}
