import { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Loader2, Settings, ExternalLink } from 'lucide-react';
import { seedSampleData } from '../services/seedService';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Language } from '../types';
import { translations } from '../translations';

export default function SystemSettings({ language }: { language: Language }) {
  const t = translations[language];
  const [isSeeding, setIsSeeding] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState<{ customers: number; jobs: number } | null>(null);

  useEffect(() => {
    const checkStats = async () => {
      try {
        const custSnap = await getDocs(query(collection(db, 'customers'), limit(1)));
        const jobsSnap = await getDocs(query(collection(db, 'jobs'), limit(1)));
        setStats({
          customers: custSnap.size,
          jobs: jobsSnap.size
        });
      } catch (err) {
        console.error("Error checking stats:", err);
      }
    };
    checkStats();
  }, [status]);

  const handleSeedData = async () => {
    setIsSeeding(true);
    setStatus('idle');
    try {
      console.log("Starting seed process...");
      await seedSampleData();
      console.log("Seed process completed successfully.");
      setStatus('success');
    } catch (error: any) {
      console.error("Seed error details:", error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to seed data. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">{t.systemSettings}</h1>
        <p className="text-stone-500">{t.manageAppData}</p>
      </header>

      <div className="grid gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">{t.sampleDataSeeding}</h2>
              <p className="text-stone-500 text-sm mt-1">
                {t.populateDatabaseDescription}
              </p>
            </div>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl mb-6">
            <h3 className="text-sm font-semibold text-stone-700 mb-2">{t.whatWillBeAdded}:</h3>
            <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
              <li>{t.sampleCustomersAdded}</li>
              <li>{t.dummyWorkersAdded}</li>
              <li>{t.plumbingJobsAdded}</li>
            </ul>

            {stats && (
              <div className="mt-4 flex gap-4">
                <div className="px-3 py-1 bg-white rounded-lg border border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  {t.customers}: {stats.customers > 0 ? <span className="text-emerald-600">✅ {t.exists}</span> : <span className="text-stone-400">❌ {t.empty}</span>}
                </div>
                <div className="px-3 py-1 bg-white rounded-lg border border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  {t.jobs}: {stats.jobs > 0 ? <span className="text-emerald-600">✅ {t.exists}</span> : <span className="text-stone-400">❌ {t.empty}</span>}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-stone-200">
              <p className="text-xs text-stone-500 mb-2">
                {t.dataStoredInFirestore}:
              </p>
              <a 
                href="https://console.firebase.google.com/project/gen-lang-client-0368953716/firestore/databases/ai-studio-196f1139-41b6-423e-8ea3-489675f4feb8/data"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                {t.viewDatabaseInConsole}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSeeding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.seedingDatabase}...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                {t.seedSampleData}
              </>
            )}
          </button>

          <AnimatePresence>
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col gap-2 text-emerald-700"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">{t.databaseSeededSuccessfully}!</span>
                </div>
                <p className="text-xs opacity-80 ml-8">
                  {t.sampleDataAvailableDescription}
                </p>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700"
              >
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 opacity-60">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
              <Settings className="w-6 h-6 text-stone-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">{t.advancedConfiguration}</h2>
              <p className="text-stone-500 text-sm mt-1">
                {t.moreSettingsFutureUpdates}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
