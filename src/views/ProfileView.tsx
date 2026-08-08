import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, LogOut, CheckCircle2, ShieldCheck, Mail, Camera, Save, AlertCircle } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { userProfile, logout, updateUserProfileData, resetPassword } = useAuth();
  const [displayName, setDisplayName] = useState<string>(userProfile?.displayName || '');
  const [photoURL, setPhotoURL] = useState<string>(userProfile?.photoURL || '');
  const [savedMsg, setSavedMsg] = useState<string>('');
  const [resetSent, setResetSent] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!userProfile) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg('');
    setIsSaving(true);
    await updateUserProfileData(displayName.trim(), photoURL.trim());
    setIsSaving(false);
    setSavedMsg('Profile updated successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleResetPass = async () => {
    await resetPassword(userProfile.email);
    setResetSent(true);
    setTimeout(() => setResetSent(false), 4000);
  };

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  ];

  return (
    <div id="profile-view" className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 relative overflow-hidden text-center space-y-3">
        <div className="relative inline-block mx-auto">
          <img
            src={photoURL || userProfile.photoURL || presetAvatars[0]}
            alt="Avatar"
            className="w-24 h-24 rounded-3xl object-cover border-2 border-purple-400 glow-purple shadow-xl mx-auto"
          />
          <span className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-purple-600 text-white shadow-md">
            <Camera className="w-4 h-4" />
          </span>
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-100">{userProfile.displayName}</h2>
          <p className="text-xs text-slate-400 mt-1">{userProfile.email}</p>
        </div>

        <div className="pt-2 flex justify-center items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {userProfile.role.toUpperCase()} ACCOUNT
          </span>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            VERIFIED QUEST EXPLORER
          </span>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-center gap-2 font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Edit Profile Form */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-purple-400" /> Edit Profile Details
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Select Avatar Preset</label>
            <div className="flex items-center space-x-3">
              {presetAvatars.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoURL(url)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${
                    photoURL === url ? 'border-purple-400 scale-110 shadow-md' : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>

      {/* Security Section */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" /> Password & Security
        </h3>
        <p className="text-xs text-slate-400">
          Click below to receive a secure password reset link sent directly to <span className="text-slate-200 font-semibold">{userProfile.email}</span>.
        </p>

        {resetSent ? (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Reset link dispatched to inbox!
          </div>
        ) : (
          <button
            onClick={handleResetPass}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-300 border border-amber-500/30 transition-colors"
          >
            Send Password Reset Link
          </button>
        )}
      </div>

      {/* Logout */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Veloura Quest</span>
        </button>
      </div>
    </div>
  );
};
