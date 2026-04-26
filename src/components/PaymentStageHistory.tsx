import React, { useState } from 'react';
import { TransactionComment, PaymentReceipt, PaymentStageHistoryData } from '../types';
import { MessageSquare, Send, User as UserIcon, IndianRupee, Calendar, Receipt, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useUser } from '../contexts/UserContext';
import { format } from 'date-fns';

interface PaymentStageHistoryProps {
  commentsJson: string | undefined | null;
  onUpdate: (newCommentsJson: string) => void;
  onReceiptAdded?: (amount: number, date: string) => void;
  readOnly?: boolean;
}

export const PaymentStageHistory: React.FC<PaymentStageHistoryProps> = ({ commentsJson, onUpdate, onReceiptAdded, readOnly = false }) => {
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');
  
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'receipts' | 'comments'>('receipts');

  let historyData: PaymentStageHistoryData = { comments: [], receipts: [] };
  try {
    if (commentsJson) {
      if (!commentsJson.startsWith('[')) {
        if (commentsJson.startsWith('{')) {
          historyData = JSON.parse(commentsJson);
          if (!historyData.comments) historyData.comments = [];
          if (!historyData.receipts) historyData.receipts = [];
        } else {
          historyData.comments = [{
            id: crypto.randomUUID(),
            text: commentsJson,
            author: 'System/Legacy',
            date: new Date().toISOString()
          }];
        }
      } else {
        historyData.comments = JSON.parse(commentsJson);
      }
    }
  } catch (e) {
    console.error('Failed to parse history data', e);
  }

  const handleAddComment = () => {
    if (!newComment.trim() || readOnly) return;
    const comment: TransactionComment = {
      id: crypto.randomUUID(),
      text: newComment.trim(),
      author: user?.full_name || 'Unknown User',
      date: new Date().toISOString()
    };
    const updatedData: PaymentStageHistoryData = {
      ...historyData,
      comments: [...historyData.comments, comment]
    };
    onUpdate(JSON.stringify(updatedData));
    setNewComment('');
  };

  const handleAddReceipt = () => {
    const amt = parseFloat(receiptAmount);
    if (isNaN(amt) || amt <= 0 || !receiptDate || readOnly) return;
    
    const receipt: PaymentReceipt = {
      id: crypto.randomUUID(),
      amount: amt,
      date: receiptDate,
      author: user?.full_name || 'Unknown User',
    };
    const updatedData: PaymentStageHistoryData = {
      ...historyData,
      receipts: [...historyData.receipts, receipt]
    };
    onUpdate(JSON.stringify(updatedData));
    setReceiptAmount('');
    if (onReceiptAdded) {
      onReceiptAdded(amt, receiptDate);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-2">
        <button 
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'receipts' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <Receipt className="w-3.5 h-3.5" /> Receipts ({historyData.receipts.length})
        </button>
        <button 
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'comments' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Comments ({historyData.comments.length})
        </button>
      </div>

      {activeTab === 'receipts' && (
        <div className="space-y-3">
          {historyData.receipts.length > 0 && (
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {historyData.receipts.map(receipt => (
                <div key={receipt.id} className="bg-emerald-50 dark:bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">₹ {receipt.amount.toLocaleString()}</span>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{receipt.date ? format(new Date(receipt.date), 'MMM d, yyyy') : 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-emerald-600/50 dark:text-emerald-400/50" />
                    <span className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">Logged by {receipt.author}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!readOnly && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#181818] rounded-xl p-2 border border-slate-200 dark:border-white/5">
              <div className="relative flex-1">
                <IndianRupee className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="number"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  className="h-8 pl-7 text-xs border-0 bg-white dark:bg-[#222] rounded-lg w-full"
                  placeholder="Amount..."
                />
              </div>
              <Input 
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="h-8 text-xs border-0 bg-white dark:bg-[#222] rounded-lg w-32 shrink-0"
              />
              <Button 
                onClick={handleAddReceipt}
                disabled={!receiptAmount || parseFloat(receiptAmount) <= 0 || !receiptDate}
                size="sm"
                className="h-8 w-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 shrink-0 p-0"
              >
                <PlusCircle className="w-4 h-4 text-white" />
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-3">
          {historyData.comments.length > 0 && (
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {historyData.comments.map(comment => (
                <div key={comment.id} className="bg-slate-50 dark:bg-[#0a0a0a] dark:bg-slate-950 dark:border-white/10 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-700 dark:text-zinc-300">{comment.text}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{comment.author}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">{comment.date ? format(new Date(comment.date), 'MMM d, h:mm a') : 'Unknown'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Input 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Add a comment..."
                className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 flex-1"
              />
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                size="icon"
                className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0 p-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

