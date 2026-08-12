import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Copy, Check, Trophy, Gift, Calendar, DollarSign, ArrowUpRight, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { formatUsdtAmount, REFERRAL_COMMISSION_RATE } from '../lib/referralCommission';

export const ReferralView: React.FC = () => {
  const { userProfile, referrals, transactions } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'commissions' | 'friends'>('commissions');

  if (!userProfile) return null;

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://veloura-quest.vercel.app';
  const referralLink = `${appOrigin}/?ref=${userProfile.referralCode}`;

  // Filter referral commission transactions for current user
  const referralTxList = transactions
    .filter(t => t.type === 'referral_bonus' && t.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Metrics Calculations
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.status === 'active' || r.status === 'completed').length;
  const totalReferralEarnings = referralTxList.reduce((sum, t) => sum + t.amount, 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysReferralEarnings = referralTxList
    .filter(t => t.createdAt.startsWith(todayStr))
    .reduce((sum, t) => sum + t.amount, 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Join me on Veloura Quest! Use my referral code ${userProfile.referralCode} to complete daily web quests and earn instant USDT cash rewards: ${referralLink}`;

  return (
    <div id="referral-view" className="space-y-6 pb-20 md:pb-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Referral Commission Rate: 50%
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Instant Credit
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
            Invite Friends & Earn <span className="electric-gradient-text">50% Daily Commissions</span>
          </h2>

          <p className="text-xs text-slate-300 max-w-xl leading-relaxed font-medium">
            Earn 50% of the task rewards earned by users you directly refer. Whenever your friend completes a daily quest, you automatically receive 50% of their task reward directly in your wallet!
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

      {/* Primary Referral Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Commission Rate */}
        <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 bg-purple-950/20">
          <span className="text-[10px] font-bold uppercase text-purple-300 block mb-1">Commission Rate</span>
          <div className="text-xl sm:text-2xl font-black text-purple-400">50%</div>
          <p className="text-[10px] text-slate-400 mt-1">Per completed task</p>
        </div>

        {/* Total Referrals */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Referrals</span>
          <div className="text-xl sm:text-2xl font-black text-slate-100">{totalReferrals}</div>
          <p className="text-[10px] text-slate-400 mt-1">Direct invites</p>
        </div>

        {/* Active Referrals */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Active Referrals</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{activeReferrals}</div>
          <p className="text-[10px] text-slate-400 mt-1">Quest active users</p>
        </div>

        {/* Total Referral Earnings */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Total Earnings</span>
          <div className="text-xl sm:text-2xl font-black text-amber-300">{formatUsdtAmount(totalReferralEarnings)} USDT</div>
          <p className="text-[10px] text-slate-400 mt-1">Lifetime commissions</p>
        </div>

        {/* Today's Referral Earnings */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Today's Earnings</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-300">{formatUsdtAmount(todaysReferralEarnings)} USDT</div>
          <p className="text-[10px] text-slate-400 mt-1">Last 24 hours</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('commissions')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'commissions'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Commission History ({referralTxList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'friends'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Referred Network ({referrals.length})</span>
        </button>
      </div>

      {/* Commission History List */}
      {activeTab === 'commissions' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Referral Commission History
            </h3>
            <span className="text-xs text-slate-400">Rate: 50%</span>
          </div>

          <div className="space-y-2.5">
            {referralTxList.length === 0 ? (
              <div className="text-center py-12 glass-panel rounded-2xl border border-slate-900 space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-xs font-medium">No referral commissions earned yet.</p>
                <p className="text-slate-500 text-[11px]">When your referred friends complete daily tasks, your 50% commission will appear here automatically!</p>
              </div>
            ) : (
              referralTxList.map((tx) => {
                const taskReward = tx.taskReward ?? (tx.amount * 2);
                const commission = tx.amount;

                return (
                  <div key={tx.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">
                          Referred User: {tx.referredUserName || 'Referred Friend'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          50% Commission
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                        <span>Referred User Task Reward: <strong className="text-slate-200">{formatUsdtAmount(taskReward)} USDT</strong></span>
                        <span>•</span>
                        <span>{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Your Referral Commission</span>
                        <span className="text-sm font-black text-emerald-400">+{formatUsdtAmount(commission)} USDT</span>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Referred Network List */}
      {activeTab === 'friends' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Your Referred Users ({referrals.length})
          </h3>

          <div className="space-y-2">
            {referrals.length === 0 ? (
              <div className="text-center py-12 glass-panel rounded-2xl border border-slate-900 space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-xs font-medium">No referrals registered yet.</p>
                <p className="text-slate-500 text-[11px]">Share your code to build your 50% commission network!</p>
              </div>
            ) : (
              referrals.map((ref) => {
                const displayName = ref.refereeName || 'Referred Friend';
                return (
                  <div key={ref.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{displayName}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Joined {new Date(ref.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active Referral
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
