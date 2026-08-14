import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSupport } from '../context/SupportContext';
import { 
  MessageSquare, 
  Send, 
  Smile, 
  ShieldCheck, 
  Headphones, 
  Clock, 
  Check, 
  CheckCheck, 
  RefreshCw, 
  AlertCircle,
  HelpCircle,
  DollarSign,
  Award,
  Wallet,
  Users,
  Lock,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface QuickTopic {
  id: string;
  label: string;
  template: string;
  icon: React.ReactNode;
}

const QUICK_TOPICS: QuickTopic[] = [
  {
    id: 'withdrawal',
    label: '💰 Withdrawal Problem',
    template: 'Hello Support, I have a question regarding my USDT TRC-20 withdrawal. My withdrawal status is: ',
    icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
  },
  {
    id: 'task',
    label: '🎯 Task Problem',
    template: 'Hello Support, I completed a 30-second quest/video task but encountered an issue with: ',
    icon: <Award className="w-3.5 h-3.5 text-purple-400" />
  },
  {
    id: 'wallet',
    label: '💳 Wallet Problem',
    template: 'Hello Support, I have an inquiry about my wallet balance and transaction history: ',
    icon: <Wallet className="w-3.5 h-3.5 text-cyan-400" />
  },
  {
    id: 'referral',
    label: '👥 Referral Problem',
    template: 'Hello Support, my invited friend joined using my referral code, but my commission is: ',
    icon: <Users className="w-3.5 h-3.5 text-indigo-400" />
  },
  {
    id: 'account',
    label: '🔐 Account Problem',
    template: 'Hello Support, I need assistance with my account security and login settings: ',
    icon: <Lock className="w-3.5 h-3.5 text-amber-400" />
  },
  {
    id: 'other',
    label: '❓ Other',
    template: 'Hello Veloura Quest Support team, I would like to ask about: ',
    icon: <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
  }
];

const POPULAR_EMOJIS = ['😀', '👍', '💰', '🎯', '⚡', '💳', '🙏', '❓', '🚀', '⏳', '🔥', '✅'];

export const SupportChatView: React.FC = () => {
  const { userProfile } = useAuth();
  const { 
    activeUserChat, 
    userMessages, 
    loadingMessages, 
    isSending, 
    sendUserMessage, 
    startNewConversation,
    markUserChatAsRead 
  } = useSupport();

  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [quickTopicsOpen, setQuickTopicsOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mark chat read on mount or when new messages arrive
  useEffect(() => {
    if (activeUserChat?.chatId) {
      markUserChatAsRead(activeUserChat.chatId);
    }
  }, [activeUserChat?.chatId, userMessages.length, markUserChatAsRead]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [userMessages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const success = await sendUserMessage(inputMessage);
    if (success) {
      setInputMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleSelectTopic = (template: string) => {
    setInputMessage(template);
    inputRef.current?.focus();
  };

  const handleAddEmoji = (emoji: string) => {
    setInputMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const isChatClosed = activeUserChat?.status === 'closed';

  return (
    <div id="support-chat-screen" className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[580px] bg-slate-900/80 rounded-3xl border border-rose-950/60 shadow-2xl backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <header className="p-4 sm:p-5 bg-slate-950/90 border-b border-rose-950/60 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center text-white shadow-lg glow-red">
              <Headphones className="w-6 h-6" />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-1.5">
                <span>💬 Support</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-400" /> Official
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              &quot;How can we help you?&quot; • Average reply &lt; 2 mins
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeUserChat && (
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isChatClosed 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {isChatClosed ? 'Closed' : 'Active'}
            </span>
          )}
        </div>
      </header>

      {/* Quick Reply Suggestions Bar */}
      {!isChatClosed && (
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 py-2.5 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Quick Inquiries
            </span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSelectTopic(topic.template)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 hover:bg-slate-850 text-xs font-semibold text-slate-200 transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
              >
                <span>{topic.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Stream Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-950/40 via-slate-900/30 to-slate-950/70">
        {loadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-400" />
            <p className="text-xs">Connecting to secure support channel...</p>
          </div>
        ) : userMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-4 my-auto py-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-100">Welcome to Veloura Quest Support</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Have questions about withdrawals, daily video &amp; ads quests, or wallet balances? Send a message below or pick a quick topic to get instant support.
              </p>
            </div>
          </div>
        ) : (
          userMessages.map((msg) => {
            const isAdmin = msg.senderRole === 'admin';
            const timeStr = msg.createdAt 
              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div
                key={msg.messageId || msg.id}
                className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-end space-x-2 max-w-[85%] sm:max-w-[75%]">
                  {isAdmin && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center text-white text-xs font-bold shrink-0 border border-purple-400/50 shadow-md">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-3 shadow-lg relative ${
                      isAdmin
                        ? 'bg-slate-800/90 border border-purple-500/40 text-slate-100 rounded-bl-xs'
                        : 'bg-gradient-to-r from-rose-600 to-purple-600 text-white rounded-br-xs glow-red'
                    }`}
                  >
                    {isAdmin && (
                      <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-black uppercase tracking-wider text-purple-300">
                        <span className="px-1.5 py-0.2 bg-purple-500/20 border border-purple-400/30 rounded text-purple-200">
                          ADMIN
                        </span>
                        <span>Veloura Support</span>
                      </div>
                    )}

                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed font-normal">
                      {msg.message}
                    </p>

                    <div className={`flex items-center justify-end space-x-1 mt-1.5 text-[10px] ${
                      isAdmin ? 'text-slate-400' : 'text-rose-200/80'
                    }`}>
                      <span>{timeStr}</span>
                      {!isAdmin && (
                        <span>
                          {msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-300" title="Read by Admin" />
                          ) : (
                            <Check className="w-3 h-3 text-rose-200" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Tray Overlay */}
      {showEmojiPicker && (
        <div className="bg-slate-950 border-t border-slate-800/80 p-3 px-4 flex items-center justify-between overflow-x-auto gap-2 shrink-0 animate-fadeIn">
          <div className="flex items-center space-x-2">
            {POPULAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleAddEmoji(emoji)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-lg active:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(false)}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
          >
            Close
          </button>
        </div>
      )}

      {/* Footer / Input Area or Closed Banner */}
      {isChatClosed ? (
        <div className="p-4 sm:p-5 bg-slate-950/95 border-t border-rose-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shrink-0">
          <div className="flex items-center space-x-2.5 text-rose-300">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">
              This support conversation has been closed.
            </span>
          </div>

          <button
            type="button"
            onClick={startNewConversation}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg hover:scale-105 transition-transform"
          >
            Start New Conversation
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-slate-950/95 border-t border-rose-950/60 flex items-center space-x-2.5 shrink-0"
        >
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-xl transition-colors ${
              showEmojiPicker ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Insert Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            maxLength={1000}
            className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-rose-500/60 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="px-4 sm:px-5 py-2.5 rounded-xl electric-gradient-btn text-xs sm:text-sm font-bold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5"
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
