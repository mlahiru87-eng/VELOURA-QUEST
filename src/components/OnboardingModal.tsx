import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Gift, Wallet, ArrowRight, Check } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { userProfile, completeOnboarding } = useAuth();
  const [step, setStep] = useState<number>(0);

  if (!userProfile || userProfile.hasSeenOnboarding) return null;

  const slides = [
    {
      title: "Welcome to Veloura Quest!",
      subtitle: "Your premier destination for daily web quests and instant cash rewards.",
      icon: <Sparkles className="w-12 h-12 text-purple-400" />,
      badge: "Step 1 of 3",
      bullets: [
        "Complete 5 assigned daily tasks every 24 hours.",
        "Watch videos, test apps, and take short surveys.",
        "Instant credit to your verified cash wallet upon completion."
      ]
    },
    {
      title: "Earn 50% Referral Commission",
      subtitle: "Share your exclusive referral code to build passive daily income.",
      icon: <Gift className="w-12 h-12 text-amber-400" />,
      badge: "Step 2 of 3",
      bullets: [
        `Your unique referral code is: ${userProfile.referralCode}`,
        "Direct referrals earn you 50% of their task rewards.",
        "Get paid automatically whenever your referred friends complete tasks!"
      ]
    },
    {
      title: "Fast, Guaranteed Cashouts",
      subtitle: "Withdraw your balance anytime via your favorite payment method.",
      icon: <Wallet className="w-12 h-12 text-emerald-400" />,
      badge: "Step 3 of 3",
      bullets: [
        "PayPal, USDT Crypto, Bank Transfer, and Amazon Gift Cards.",
        "Minimum withdrawal threshold of 20 USDT.",
        "Real-time transaction log & withdrawal status tracker."
      ]
    }
  ];

  const currentSlide = slides[step];

  const handleNext = async () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      await completeOnboarding();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-purple-500/40 p-6 sm:p-8 shadow-2xl overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {currentSlide.badge}
          </span>
          <div className="flex space-x-1.5">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === step ? 'w-6 bg-purple-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-4 py-2">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
            {currentSlide.icon}
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-100">{currentSlide.title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">{currentSlide.subtitle}</p>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2.5 text-xs">
            {currentSlide.bullets.map((b, i) => (
              <div key={i} className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  ✓
                </span>
                <span className="text-slate-300 font-medium">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={completeOnboarding}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Skip Intro
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-3 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg glow-purple flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <span>{step === slides.length - 1 ? "Start Questing" : "Next"}</span>
            {step === slides.length - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
