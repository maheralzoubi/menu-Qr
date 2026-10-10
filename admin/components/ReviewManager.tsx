import React, { useState, useEffect } from 'react';
import {
  Star, Trash2, ThumbsUp, ThumbsDown,
  MessageSquare, Search, ChevronRight, TrendingUp, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../../src/lib/auth';
import { pushNavParam, goBack } from '../lib/navHistory';

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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('reviewId')
  );
  const reviewKey = (r: Review) => r._id ?? r.id ?? '';
  const selectedReview = reviews.find(r => reviewKey(r) === selectedReviewId) ?? null;
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onPopState = () => setSelectedReviewId(new URLSearchParams(window.location.search).get('reviewId'));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectReview = (review: Review) => {
    setSelectedReviewId(reviewKey(review));
    pushNavParam('reviewId', reviewKey(review));
  };
  const closeReview = () => { goBack(); };

  const fetchReviews = async () => {
    try {
      const res = await authFetch('/api/reviews');
      if (res.ok) setReviews(await res.json());
    } catch (error) { console.error('Failed to fetch reviews:', error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('reviews.deleteConfirm'))) return;
    try {
      const res = await authFetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReviews(prev => prev.filter(r => reviewKey(r) !== id));
        if (selectedReview && reviewKey(selectedReview) === id) closeReview();
      }
    } catch (error) { console.error('Failed to delete review:', error); }
  };

  const filteredReviews = reviews.filter(review =>
    (review.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.comment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const positive = reviews.filter(r => r.rating >= 4).length;
  const neutral  = reviews.filter(r => r.rating === 3).length;
  const negative = reviews.filter(r => r.rating <= 2).length;
  const total    = reviews.length || 1;
  const sentiment = {
    positive: Math.round((positive / total) * 100),
    neutral:  Math.round((neutral  / total) * 100),
    negative: Math.round((negative / total) * 100),
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar lg:pe-1 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="ds-page-title">{t('reviews.heading')}</h1>
            <p className="ds-page-sub">{t('reviews.subtext')}</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input type="text" placeholder={t('reviews.searchPlaceholder')}
              className="ds-input ps-9"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="ds-card ds-card-pad flex flex-col items-center justify-center text-center">
            <p className="ds-metric-lbl mb-2">{t('reviews.averageRating')}</p>
            <p className="ds-metric-val tabular mb-2">{averageRating}</p>
            <div className="flex items-center gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(averageRating)) ? 'text-warn5 fill-current' : 'text-surface-container-highest'}`} />
              ))}
            </div>
            <p className="text-xs text-on-surface-variant">{t('reviews.basedOn', { count: reviews.length })}</p>
          </div>

          <div className="ds-card ds-card-pad">
            <p className="ds-metric-lbl mb-4">{t('reviews.sentiment')}</p>
            <div className="space-y-4">
              {[
                { labelKey: 'reviews.positive', value: sentiment.positive, color: 'bg-pos5',  icon: ThumbsUp },
                { labelKey: 'reviews.neutral',  value: sentiment.neutral,  color: 'bg-outline', icon: MessageSquare },
                { labelKey: 'reviews.negative', value: sentiment.negative, color: 'bg-neg5',  icon: ThumbsDown },
              ].map(item => (
                <div key={item.labelKey} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-on-surface">
                      <item.icon className="w-3.5 h-3.5 text-on-surface-variant" />
                      <span className="font-medium">{t(item.labelKey)}</span>
                    </div>
                    <span className="font-semibold tabular">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }} className={`h-full rounded-full ${item.color}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ds-card ds-card-pad flex flex-col justify-between">
            <div>
              <p className="ds-metric-lbl">{t('reviews.totalReviews')}</p>
              <p className="ds-metric-val tabular mt-1">{reviews.length}</p>
              <p className="text-xs font-semibold text-pos6 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> {t('reviews.positivePct', { percent: sentiment.positive })}
              </p>
            </div>
            <div className="mt-4 space-y-1.5">
              {[1, 2, 3, 4, 5].map(star => {
                const count = reviews.filter(r => r.rating === star).length;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="flex items-center justify-end gap-0.5 w-7 font-semibold tabular">
                      {star}<Star className="w-3 h-3 text-warn5 fill-current" />
                    </span>
                    <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-warn5 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <span className="text-on-surface-variant tabular w-5 text-end">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Review grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-surface-container rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredReviews.map((review, i) => (
                <motion.div key={reviewKey(review)} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => selectReview(review)}
                  className={`group ds-card ds-card-pad cursor-pointer transition-colors hover:border-input ${
                    selectedReview && reviewKey(selectedReview) === reviewKey(review) ? 'ring-2 ring-primary' : ''
                  }`}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-acc-soft text-acc text-xs font-bold flex items-center justify-center shrink-0">
                          {review.userInitials || review.userName?.slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-on-surface leading-tight truncate">{review.userName || t('reviews.anonymous')}</h4>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[...Array(5)].map((_, idx) => (
                              <Star key={idx} className={`w-3 h-3 ${idx < review.rating ? 'text-warn5 fill-current' : 'text-surface-container-highest'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-on-surface-variant whitespace-nowrap">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : review.date}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-[13px] leading-relaxed line-clamp-3">"{review.comment}"</p>
                    <div className="flex items-center justify-between pt-3 border-t border-line">
                      <span className="ds-chip ds-chip-pos"><span className="ds-dot" />{t('reviews.verifiedGuest')}</span>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:text-on-surface transition-colors rtl:-scale-x-100" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredReviews.length === 0 && !isLoading && (
              <div className="md:col-span-2 ds-empty">
                <MessageSquare className="w-8 h-8 opacity-40" />
                <p className="text-sm">{reviews.length === 0 ? t('reviews.noReviews') : t('reviews.noResults')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="lg:w-96 shrink-0 lg:h-full">
        <AnimatePresence mode="wait">
          {selectedReview ? (
            <motion.div key={reviewKey(selectedReview)}
              initial={{ opacity: 0, x: isRTL ? -8 : 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? -8 : 8 }}
              className="fixed inset-0 z-40 lg:static lg:inset-auto lg:z-auto h-full bg-card lg:border lg:border-line lg:rounded-2xl lg:shadow-sm p-5 flex flex-col">
              <div className="flex justify-between items-center gap-3 pb-4 mb-4 border-b border-line">
                <h3 className="ds-section-title">{t('reviews.detailHeading')}</h3>
                <button onClick={closeReview} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
                <div className="text-center pb-4 border-b border-line">
                  <div className="w-14 h-14 rounded-full bg-acc-soft text-acc flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                    {selectedReview.userInitials || selectedReview.userName?.slice(0, 2).toUpperCase() || '?'}
                  </div>
                  <h4 className="text-base font-semibold text-on-surface">{selectedReview.userName || t('reviews.anonymous')}</h4>
                  <div className="flex justify-center items-center gap-0.5 mt-2">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className={`w-4 h-4 ${idx < selectedReview.rating ? 'text-warn5 fill-current' : 'text-surface-container-highest'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2">
                    {selectedReview.createdAt ? new Date(selectedReview.createdAt).toLocaleDateString() : selectedReview.date}
                  </p>
                </div>
                <div className="ds-inset p-3.5">
                  <p className="text-sm leading-relaxed text-on-surface-variant">"{selectedReview.comment}"</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-line">
                <button onClick={() => handleDelete(reviewKey(selectedReview))}
                  className="ds-btn ds-btn-danger-soft w-full">
                  <Trash2 className="w-4 h-4" /> {t('reviews.deleteReview')}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="hidden lg:flex h-full ds-empty">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-sm font-semibold text-on-surface">{t('reviews.noSelected')}</p>
              <p className="text-[13px]">{t('reviews.noSelectedMsg')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
