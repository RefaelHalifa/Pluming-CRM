import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Job, UserProfile, Language } from '../types';
import { translations } from '../translations';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  ThumbsUp, 
  ThumbsDown,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function WorkerPortal({ profile, language }: { profile: UserProfile, language: Language }) {
  const t = translations[language];
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [summary, setSummary] = useState('');
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'jobs'), 
      where('workerId', '==', profile.uid),
      orderBy('date', 'desc')
    );
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
    return () => unsubscribe();
  }, [profile.uid]);

  const handleSubmitSummary = async () => {
    if (!selectedJob) return;
    try {
      await updateDoc(doc(db, 'jobs', selectedJob.id), {
        workerSummary: summary,
        isSuccess: isSuccess,
        status: 'completed',
        paymentStatus: isPaid ? 'paid' : 'unpaid'
      });
      setSelectedJob(null);
      setSummary('');
      setIsSuccess(null);
      setIsPaid(false);
    } catch (error) {
      console.error('Error updating job', error);
    }
  };

  return (
    <div className="space-y-8" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">{t.workerPortal}</h2>
          <p className="text-stone-500">{t.manageAssignedJobs}</p>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {jobs.filter(j => j.status === 'completed').length} {t.completed}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Jobs List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">{t.activeAssignments}</h3>
          {jobs.filter(j => j.status !== 'completed').length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-400">
              <p>{t.noActiveAssignments}</p>
            </div>
          ) : (
            jobs.filter(j => j.status !== 'completed').map(job => (
              <motion.button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`w-full text-left bg-white p-6 rounded-2xl border transition-all ${
                  selectedJob?.id === job.id ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-1">{format(job.date, language === 'he' ? 'd בMMM, h:mm a' : 'MMM d, h:mm a')}</p>
                    <h4 className="font-bold text-stone-900">{job.customerName}</h4>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-stone-300 transition-transform ${selectedJob?.id === job.id ? 'rotate-90' : ''} ${language === 'he' ? 'rotate-180' : ''}`} />
                </div>
                <p className="text-sm text-stone-600 line-clamp-2">{job.description}</p>
              </motion.button>
            ))
          )}

          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mt-8">{t.recentHistory}</h3>
          <div className="space-y-2">
            {jobs.filter(j => j.status === 'completed').slice(0, 5).map(job => (
              <div key={job.id} className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-stone-900">{job.customerName}</p>
                  <p className="text-xs text-stone-500">{format(job.date, language === 'he' ? 'd בMMM' : 'MMM d')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {job.isSuccess ? <ThumbsUp className="w-4 h-4 text-emerald-500" /> : <ThumbsDown className="w-4 h-4 text-red-500" />}
                  <span className={`text-[10px] font-bold uppercase ${job.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {t[job.paymentStatus as keyof typeof t] || job.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job Details & Summary Form */}
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm h-fit sticky top-8">
          <AnimatePresence mode="wait">
            {selectedJob ? (
              <motion.div
                key={selectedJob.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold text-stone-900 mb-2">{t.jobDetails}</h3>
                  <div className="flex items-center gap-4 text-sm text-stone-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(selectedJob.date, 'h:mm a')}
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      ₪{selectedJob.amount}
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl">
                  <p className="text-sm font-bold text-stone-400 uppercase mb-2">{t.instructions}</p>
                  <p className="text-stone-700">{selectedJob.description}</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-stone-100">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {t.workSummary}
                    </label>
                    <textarea
                      placeholder={t.describeWhatYouDid}
                      value={summary}
                      onChange={e => setSummary(e.target.value)}
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 h-32"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setIsSuccess(true)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                        isSuccess === true ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-stone-100 text-stone-400 hover:bg-stone-50'
                      }`}
                    >
                      <ThumbsUp className="w-5 h-5" />
                      {t.success}
                    </button>
                    <button
                      onClick={() => setIsSuccess(false)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                        isSuccess === false ? 'bg-red-50 border-red-500 text-red-700' : 'border-stone-100 text-stone-400 hover:bg-stone-50'
                      }`}
                    >
                      <ThumbsDown className="w-5 h-5" />
                      {t.failed}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="paid"
                      checked={isPaid}
                      onChange={e => setIsPaid(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500"
                    />
                    <label htmlFor="paid" className="text-sm font-medium text-stone-700">
                      {t.paymentReceivedOnSite}
                    </label>
                  </div>

                  <button
                    onClick={handleSubmitSummary}
                    disabled={isSuccess === null || !summary}
                    className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {t.completeJobAndSubmit}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="py-20 text-center text-stone-400">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p>{t.selectAssignmentToViewDetails}</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
