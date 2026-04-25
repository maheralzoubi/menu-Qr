/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Star, Camera, Send } from 'lucide-react';

export const WriteReviewScreen = ({ onSubmit }: { onSubmit: () => void }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [userName, setUserName] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePostReview = async () => {
    if (rating === 0 || !userName.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: userName.trim(),
          userInitials: userName.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          rating,
          comment
        })
      });
      if (response.ok) {
        onSubmit();
      }
    } catch (error) {
      console.error('Failed to post review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-32 px-6 max-w-md mx-auto space-y-8">
      <section className="space-y-2">
        <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Share Your Experience</h2>
        <p className="text-on-surface-variant font-medium">Your feedback helps us perfect our craft.</p>
      </section>

      <div className="bg-surface-container-low rounded-[2.5rem] p-8 space-y-8 shadow-sm">
        <div className="space-y-4">
          <label className="font-headline font-bold text-sm tracking-wide text-on-surface-variant uppercase px-2">Your Name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="How should we call you?"
            className="w-full bg-surface-container-lowest border-none rounded-2xl p-4 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
          />
        </div>

        <div className="space-y-4">
          <label className="font-headline font-bold text-sm tracking-wide text-on-surface-variant uppercase px-2">Overall Rating</label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform active:scale-90"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                <Star 
                  className={`w-10 h-10 transition-colors duration-200 ${
                    star <= (hover || rating) ? 'fill-primary text-primary' : 'text-surface-container-highest'
                  }`} 
                />
              </button>
            ))}
          </div>
          <p className="text-center text-xs font-bold text-primary uppercase tracking-widest h-4">
            {rating === 5 ? 'Exceptional' : 
             rating === 4 ? 'Great' : 
             rating === 3 ? 'Good' : 
             rating === 2 ? 'Fair' : 
             rating === 1 ? 'Poor' : ''}
          </p>
        </div>

        <div className="space-y-4">
          <label className="font-headline font-bold text-sm tracking-wide text-on-surface-variant uppercase px-2">Your Thoughts</label>
          <div className="relative group">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you love about your meal?"
              className="w-full bg-surface-container-lowest border-none rounded-3xl p-6 text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/20 transition-all min-h-[160px] resize-none text-sm leading-relaxed"
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-bold text-on-surface-variant/20 uppercase tracking-widest">
              {comment.length}/500
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button className="w-full py-4 rounded-2xl bg-surface-container-highest text-on-surface-variant font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors">
            <Camera className="w-4 h-4" /> Add a photo of your dish
          </button>
        </div>
      </div>

      <button 
        onClick={handlePostReview}
        disabled={rating === 0 || !userName.trim() || isSubmitting}
        className={`w-full py-5 rounded-2xl font-headline font-extrabold text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
          rating > 0 && userName.trim() && !isSubmitting
            ? 'bg-signature-gradient text-white shadow-primary/20 hover:scale-[1.02] active:scale-95' 
            : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
        }`}
      >
        <Send className="w-5 h-5" /> {isSubmitting ? 'Posting...' : 'Post Review'}
      </button>

      <p className="text-center text-[10px] text-on-surface-variant/40 font-medium uppercase tracking-[0.2em] px-8">
        By posting, you agree to our community guidelines
      </p>
    </div>
  );
};
