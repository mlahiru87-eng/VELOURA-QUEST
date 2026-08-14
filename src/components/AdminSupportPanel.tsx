import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSupport } from '../context/SupportContext';
import { useToast } from '../context/ToastContext';
import { SupportChat, SupportMessage } from '../types';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Check, 
  CheckCheck, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Lock, 
  Unlock, 
  User, 
  Mail, 
  Sparkles,
  ExternalLink,
  Filter,
  DollarSign
} from 'lucide-react';

const ADMIN_QUICK_RESPONSES = [
  "Hello! We're reviewing your inquiry and will help you shortly.",
  "Your 30-second quest verification has been checked and verified.",
  "Your USDT TRC-20 payout has been processed successfully.",
  "We've adjusted your wallet balance. Please check your transaction history.",
  "Thank you for contacting Veloura Quest Support! Let us know if you need anything else."
];

export const AdminSupportPanel: React.FC = () => {
  const { allUsers } = useAuth();
  const { 
    allChats, 
    adminActiveChat, 
    adminMessages, 
    selectAdminChat, 
    sendAdminReply, 
    updateChatStatus,
    unreadForAdminCount 
  } = useSupport();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'open' | 'closed'>('all');
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [adminMessages]);

  // Filter conversations
  const filteredChats = allChats.filter((chat) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (chat.userName || '').toLowerCase().includes(q);
    const emailMatch = (chat.userEmail || '').toLowerCase().includes(q);
    const uidMatch = (chat.userId || '').toLowerCase().includes(q);
    const idMatch = (chat.chatId || '').toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || emailMatch || uidMatch || idMatch;

    if (!matchesSearch) return false;

    if (statusFilter === 'unread') {
      return (chat.unreadForAdmin || 0) > 0;
    }
    if (statusFilter === 'open') {
      return chat.status === 'open';
    }
    if (statusFilter === 'closed') {
      return chat.status === 'closed';
    }
    return true;
  });

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminActiveChat || !replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    const success = await sendAdminReply(
      adminActiveChat.chatId,
      replyText.trim(),
      adminActiveChat.userId
    );
    setIsSubmittingReply(false);

    if (success) {
      setReplyText('');
      showToast("Reply Sent", "Your response has been sent to the user.", "success");
    } else {
      showToast("Error", "Failed to send admin reply.", "error");
    }
  };

  const handleToggleStatus = async (newStatus: 'open' | 'closed') => {
    if (!adminActiveChat) return;
    await updateChatStatus(adminActiveChat.chatId, newStatus);
    showToast("Chat Updated", `Conversation marked as ${newStatus}.`, "info");
  };

  // Find user metadata for sidebar details
  const targetUserProfile = allUsers.find(u => u.uid === adminActiveChat?.userId);

  return (
    <div id="admin-support-panel" className="glass-panel rounded-3xl border border-slate-800 overflow-hidden flex flex-col md:flex-row h-[750px] shadow-2xl">
      {/* Left Column: Conversation Directory & Filters */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-950/70 ${adminActiveChat ? 'hidden md:flex' : 'flex'}`}>
        {/* Search & Header */}
        <div className="p-4 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span>Support Inbox</span>
              {unreadForAdminCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                  {unreadForAdminCount} new
                </span>
              )}
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{filteredChats.length} chats</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, or user ID..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            {(['all', 'unread', 'open', 'closed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`flex-1 py-1.5 rounded-lg capitalize transition-all text-center ${
                  statusFilter === filter
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter === 'unread' && unreadForAdminCount > 0 ? `Unread (${unreadForAdminCount})` : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">No conversations matching current filter</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = adminActiveChat?.chatId === chat.chatId;
              const hasUnread = (chat.unreadForAdmin || 0) > 0;
              const timeStr = chat.lastMessageAt || chat.updatedAt || chat.createdAt
                ? new Date(chat.lastMessageAt || chat.updatedAt || chat.createdAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '';

              return (
                <div
                  key={chat.chatId}
                  onClick={() => selectAdminChat(chat)}
                  className={`p-3.5 cursor-pointer transition-all flex items-start space-x-3 hover:bg-slate-850/80 ${
                    isSelected ? 'bg-purple-950/40 border-l-4 border-purple-500' : ''
                  }`}
                >
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={chat.userPhotoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                      alt={chat.userName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700"
                    />
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-slate-950 animate-bounce">
                        {chat.unreadForAdmin}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className={`text-xs truncate ${hasUnread ? 'font-black text-white' : 'font-bold text-slate-200'}`}>
                        {chat.userName || 'User'}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0">{timeStr}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mb-1">
                      {chat.userEmail}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${hasUnread ? 'font-bold text-slate-100' : 'text-slate-400'}`}>
                        {chat.lastSenderRole === 'admin' ? '🛡️ You: ' : '👤 '}
                        {chat.lastMessage || 'Conversation started'}
                      </p>
                      
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                        chat.status === 'open' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {chat.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Active Conversation & Messages Area */}
      <div className={`flex-1 flex flex-col bg-slate-900/60 ${adminActiveChat ? 'flex' : 'hidden md:flex'}`}>
        {adminActiveChat ? (
          <>
            {/* Active Chat Header */}
            <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => selectAdminChat(null)}
                  className="md:hidden px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-200"
                >
                  ← Back
                </button>

                <img
                  src={adminActiveChat.userPhotoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                  alt={adminActiveChat.userName}
                  className="w-10 h-10 rounded-full object-cover border border-purple-500/40 shrink-0"
                />

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-100">{adminActiveChat.userName}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      adminActiveChat.status === 'open' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {adminActiveChat.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{adminActiveChat.userEmail}</span>
                    <span>•</span>
                    <span className="text-[11px] font-mono text-slate-500">UID: {adminActiveChat.userId.slice(0, 8)}...</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {targetUserProfile && (
                  <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-400">Balance:</span>
                    <span className="text-emerald-400 font-extrabold">${targetUserProfile.currentBalance.toFixed(2)}</span>
                  </div>
                )}

                {adminActiveChat.status === 'open' ? (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus('closed')}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-bold text-rose-300 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" /> Close Chat
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus('open')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Reopen Chat
                  </button>
                )}
              </div>
            </div>

            {/* Quick Templates Bar for Admin */}
            <div className="bg-slate-950/40 border-b border-slate-800/80 px-4 py-2 overflow-x-auto no-scrollbar shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3" /> Quick Snippets:
                </span>
                {ADMIN_QUICK_RESPONSES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setReplyText(tmpl);
                      replyInputRef.current?.focus();
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-900/30 border border-slate-700 text-[11px] text-slate-300 hover:text-purple-200 transition-colors"
                  >
                    {tmpl.slice(0, 32)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-950/30">
              {adminMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                  <Clock className="w-8 h-8 opacity-40" />
                  <p className="text-xs">No messages recorded in this conversation yet</p>
                </div>
              ) : (
                adminMessages.map((msg) => {
                  const isAdmin = msg.senderRole === 'admin';
                  const timeStr = msg.createdAt 
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={msg.messageId || msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-end space-x-2 max-w-[85%] sm:max-w-[75%]">
                        {!isAdmin && (
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0 border border-slate-700">
                            <User className="w-4 h-4" />
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-3 shadow-lg relative ${
                            isAdmin
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs glow-purple'
                              : 'bg-slate-800/95 border border-slate-700 text-slate-100 rounded-bl-xs'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-black uppercase tracking-wider">
                            {isAdmin ? (
                              <span className="text-purple-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-purple-200" /> ADMIN (You)
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                {msg.senderName || adminActiveChat.userName}
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.message}
                          </p>

                          <div className={`flex items-center justify-end space-x-1 mt-1.5 text-[10px] ${
                            isAdmin ? 'text-purple-200/80' : 'text-slate-400'
                          }`}>
                            <span>{timeStr}</span>
                            {isAdmin && (
                              <span>
                                {msg.read ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-300" title="Read by User" />
                                ) : (
                                  <Check className="w-3 h-3 text-purple-200" title="Delivered" />
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

            {/* Admin Reply Form */}
            <form
              onSubmit={handleSendReply}
              className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center space-x-3 shrink-0"
            >
              <input
                ref={replyInputRef}
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={adminActiveChat.status === 'closed' ? "Chat is closed (replying will send a message)..." : "Type reply as Veloura Support Admin..."}
                maxLength={2000}
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!replyText.trim() || isSubmittingReply}
                className="px-5 py-2.5 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform flex items-center space-x-1.5 shrink-0"
              >
                {isSubmittingReply ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Reply</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-lg">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="max-w-sm">
              <h4 className="text-base font-bold text-slate-100">Select a Support Conversation</h4>
              <p className="text-xs text-slate-400 mt-1">
                Choose a conversation from the left directory to inspect message history, provide official support answers, or manage ticket status.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
