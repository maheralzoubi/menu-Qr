import React, { useState, useEffect } from 'react';
import {
  Star, Trash2, User, Quote, ThumbsUp, ThumbsDown,
  MessageSquare, Search, ChevronRight, TrendingUp, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authFetch } from '../../src/lib/auth';

interface Review {
  _id: string;
  id?: string;
  userName: string;
  userInitials: string;
  rating: number;
  comment: string;
  date: string;
  image?: string;
  createdAt?: string;
}

export const ReviewManager = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReviews = async () => {
    try {
      const res = await authFetch('/api/reviews');
      if (res.ok) setReviews(await res.json());
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    try {
      const res = await authFetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReviews(prev => prev.filter(r => reviewKey(r) !== id));
        if (selectedReview && reviewKey(selectedReview) === id) setSelectedReview(null);
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  };

  const reviewKey = (r: Review) => r._id ?? r.id ?? '';

  const filteredReviews = reviews.filter(review =>
    (review.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.comment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  // Compute real sentiment from ratings
  const positive = reviews.filter(r => r.rating >= 4).length;
  const neutral = reviews.filter(r => r.rating === 3).length;
  const negative = reviews.filter(r => r.rating <= 2).length;
  const total = reviews.length || 1;
  const sentiment = {
    positive: Math.round((positive / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((negative / total) * 100),
  };

  return (
    <div className="flex h-full gap-10">
      <div className="flex-1 space-y-10 overflow-y-auto no-scrollbar pr-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight">Guest Feedback</h2>
            <p className="text-on-surface-variant font-medium">Analyze guest sentiment and manage reviews.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
            <input
              type="text"
              placeholder="Search reviews..."
              className="bg-surface-container-high border-none rounded-xl py-3 pl-12 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low p-8 rounded-4xl flex flex-col items-center justify-center text-center shadow-sm border border-outline-variant/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-2">Average Rating</p>
            <h4 className="text-5xl font-headline font-extrabold text-primary mb-2">{averageRating}</h4>
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(averageRating)) ? 'text-amber-400 fill-amber-400' : 'text-surface-variant'}`} />
              ))}
            </div>
            <p className="text-xs font-bold text-on-surface-variant">Based on {reviews.length} reviews</p>
          </div>

          <div className="bg-surface-container-low p-8 rounded-4xl shadow-sm border border-outline-variant/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-6">Sentiment Breakdown</p>
            <div className="space-y-5">
              {[
                { label: 'Positive (4-5★)', value: sentiment.positive, color: 'bg-emerald-500', icon: ThumbsUp },
                { label: 'Neutral (3★)', value: sentiment.neutral, color: 'bg-amber-400', icon: MessageSquare },
                { label: 'Negative (1-2★)', value: sentiment.negative, color: 'bg-rose-500', icon: ThumbsDown },
              ].map(item => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-3 h-3 text-on-surface-variant" />
                      <span>{item.label}</span>
                    </div>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }} className={`h-full ${item.color}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-4xl shadow-sm border border-outline-variant/10 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-4">Total Reviews</p>
              <h4 className="text-4xl font-headline font-extrabold">{reviews.length}</h4>
              <p className="text-xs font-bold text-primary flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> {sentiment.positive}% positive
              </p>
            </div>
            <div className="mt-6 space-y-2">
              {[1, 2, 3, 4, 5].map(star => {
                const count = reviews.filter(r => r.rating === star).length;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-right font-bold">{star}★</span>
                    <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <span className="text-on-surface-variant w-4">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Review grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-surface-container-low rounded-4xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredReviews.map((review, i) => (
                <motion.div
                  key={reviewKey(review)}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedReview(review)}
                  className={`group p-8 bg-surface-container-low rounded-4xl border border-outline-variant/10 hover:bg-surface-container-lowest hover:shadow-xl transition-all cursor-pointer relative overflow-hidden ${
                    selectedReview && reviewKey(selectedReview) === reviewKey(review) ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <Quote className="absolute -right-4 -top-4 w-32 h-32 text-on-surface-variant/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center font-bold text-sm text-on-surface-variant">
                          {review.userInitials || review.userName?.slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h4 className="font-bold leading-tight">{review.userName || 'Anonymous'}</h4>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[...Array(5)].map((_, idx) => (
                              <Star key={idx} className={`w-3 h-3 ${idx < review.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-variant'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : review.date}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-3 italic">"{review.comment}"</p>
                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Verified Guest</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant/30 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredReviews.length === 0 && !isLoading && (
              <div className="col-span-2 text-center py-20 text-on-surface-variant/40">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">{reviews.length === 0 ? 'No reviews yet' : 'No results found'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="w-96 shrink-0 h-full">
        <AnimatePresence mode="wait">
          {selectedReview ? (
            <motion.div
              key={reviewKey(selectedReview)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full bg-surface-container-low rounded-4xl p-8 flex flex-col shadow-2xl shadow-primary/5"
            >
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-2xl font-headline font-extrabold tracking-tight">Review Details</h3>
                <button onClick={() => setSelectedReview(null)} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
                <div className="text-center pb-6 border-b border-outline-variant/10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3 text-xl font-bold">
                    {selectedReview.userInitials || selectedReview.userName?.slice(0, 2).toUpperCase() || '?'}
                  </div>
                  <h4 className="text-lg font-bold">{selectedReview.userName || 'Anonymous'}</h4>
                  <div className="flex justify-center items-center gap-1 mt-2">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className={`w-5 h-5 ${idx < selectedReview.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-variant'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2">
                    {selectedReview.createdAt ? new Date(selectedReview.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : selectedReview.date}
                  </p>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-2xl relative">
                  <Quote className="absolute -left-1 -top-1 w-6 h-6 text-primary/10" />
                  <p className="text-sm leading-relaxed italic text-on-surface-variant">"{selectedReview.comment}"</p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => handleDelete(reviewKey(selectedReview))}
                  className="w-full py-4 rounded-2xl bg-surface-container-high font-bold text-sm hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Review
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full bg-surface-container-low/50 border-2 border-dashed border-outline-variant/30 rounded-4xl flex flex-col items-center justify-center p-12 text-center text-on-surface-variant/40">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-bold">No Review Selected</p>
              <p className="text-sm">Click a review to see details.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
