import React, { useState } from 'react';
import { TransactionComment } from '../types';
import { MessageSquare, Send, User as UserIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useUser } from '../contexts/UserContext';
import { format } from 'date-fns';

interface TransactionCommentsProps {
  commentsJson: string | undefined | null;
  onUpdate: (newCommentsJson: string) => void;
}

export const TransactionComments: React.FC<TransactionCommentsProps> = ({ commentsJson, onUpdate }) => {
  const { user } = useUser();
  const [newComment, setNewComment] = useState('');

  let comments: TransactionComment[] = [];
  try {
    if (commentsJson) {
      // Handle legacy string comments by converting them to the new format
      if (!commentsJson.startsWith('[')) {
        comments = [{
          id: crypto.randomUUID(),
          text: commentsJson,
          author: 'System/Legacy',
          date: new Date().toISOString()
        }];
      } else {
        comments = JSON.parse(commentsJson);
      }
    }
  } catch (e) {
    console.error('Failed to parse comments', e);
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: TransactionComment = {
      id: crypto.randomUUID(),
      text: newComment.trim(),
      author: user?.full_name || 'Unknown User',
      date: new Date().toISOString()
    };

    const updatedComments = [...comments, comment];
    onUpdate(JSON.stringify(updatedComments));
    setNewComment('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
        <MessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})
      </div>
      
      {comments.length > 0 && (
        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
          {comments.map(comment => (
            <div key={comment.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-700">{comment.text}</p>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1">
                  <UserIcon className="w-3 h-3 text-slate-400" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{comment.author}</span>
                </div>
                <span className="text-[9px] text-slate-400">{format(new Date(comment.date), 'MMM d, h:mm a')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
          className="h-9 text-xs rounded-xl border-slate-200 flex-1"
        />
        <Button 
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          size="icon"
          className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
