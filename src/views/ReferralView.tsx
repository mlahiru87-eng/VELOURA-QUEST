import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Copy, Check, Trophy, Gift, Clock, CheckCircle2 } from 'lucide-react';

export const ReferralView: React.FC = () => {
  const { userProfile, referrals, settings } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);

  if (!userProfile) return null;

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://veloura-quest.vercel.app';
  const referralLink = `${appOrigin}/ref?code=${userProfile.referralCode}`;
  
  // Completed referral earnings
  const completedReferrals = referrals.filter(r => r.status === 'completed');
  const totalReferralEarnings = completedReferrals.reduce((sum, r) => sum + (r.rewardAmount || settings.referralBonus || 5.00), 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Join me on Veloura Quest! Use my code ${userProfile.referralCode} to claim your welcome bonus and earn daily cash rewards: ${referralLink}`;

  return (
    <div id="referral-view" className="space-y-6 pb-20 md:pb-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            Anti-Abuse Verified Referral Engine
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
            Invite Friends & Earn <span className="electric-gradient-text">${settings.referralBonus.toFixed(2)} Cash</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Share your unique referral code. When your referred friend registers and completes their 1st daily quest, you instantly unlock $5.00 cash directly to your wallet!
          </p>
        </div>
      </div>

      {/* Code & Share Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Your Unique Referral Code</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 font-mono text-lg font-black text-amber-300 text-center tracking-widest">
                {userProfile.referralCode}
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Your Referral Link</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 glass-input rounded-xl px-3.5 py-3 text-xs text-slate-300 font-mono truncate"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-3 rounded-xl electric-gradient-btn text-white font-bold text-xs shadow-md transition-transform hover:scale-105"
              >
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-2">Quick Share:</span>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors"
          >
            WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-500/30 transition-colors"
          >
            Telegram
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-bold border border-sky-500/30 transition-colors"
          >
            Twitter / X
          </a>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Referred Friends</span>
            <div className="text-2xl font-black text-slate-100">{referrals.length} Refers</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400">Unlocked Referral Earnings</span>
            <div className="text-2xl font-black text-amber-300">${totalReferralEarnings.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Referral History List */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100">Your Referred Friends List</h3>

        <div className="space-y-2">
          {referrals.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No referrals recorded yet. Share your code to earn your first $5.00 bonus!
            </div>
          ) : (
            referrals.map((ref) => {
              const isCompleted = ref.status === 'completed';
              return (
                <div key={ref.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{ref.refereeName || 'Quest Explorer'}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Joined {new Date(ref.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`text-xs font-black ${isCompleted ? 'text-emerald-400' : 'text-slate-400'}`}>
                      +${(ref.rewardAmount || settings.referralBonus || 5.00).toFixed(2)}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border flex items-center gap-1 ${
                      isCompleted 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{isCompleted ? 'Unlocked' : 'Pending Task'}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
