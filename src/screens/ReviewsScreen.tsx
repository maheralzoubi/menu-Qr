import { useState, useEffect, useMemo } from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../components/Skeleton';
import { Review } from '../types';

export const ReviewsScreen = ({ onWriteReview, restaurantId }: { onWriteReview: () => void; restaurantId: string }) => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/reviews?restaurantId=${restaurantId}`);
        const data = await response.json();
        setReviews(data);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="pt-24 pb-48 px-6 max-w-md mx-auto space-y-10">
        <section className="text-center space-y-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </section>
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-surface-container-lowest rounded-[2rem] p-8 space-y-4 border border-outline-variant/20 shadow-sm">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-48 px-6 max-w-md mx-auto">
      <section className="mb-10 text-center">
        <h2 className="font-headline text-4xl font-extrabold text-on-surface mb-2">{t('reviews.title')}</h2>
        <p className="text-on-surface-variant font-medium mb-6">{t('reviews.subtitle')}</p>
        <div className="bg-surface-container rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-5xl font-headline font-extrabold text-primary">{averageRating}</span>
            <span className="text-on-surface-variant font-bold text-lg">{t('reviews.outOf5')}</span>
          </div>
          <div className="flex gap-1 mb-4 text-primary">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-6 h-6 ${i < Math.round(Number(averageRating)) ? 'fill-primary' : 'text-primary'}`} />
            ))}
          </div>
          <p className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">
            {t('reviews.averageRating', { rating: averageRating })}
          </p>
          <div className="mt-4 px-4 py-1.5 bg-surface-container-highest rounded-full text-xs font-bold text-on-surface">
            {t('reviews.basedOn', { count: reviews.length })}
          </div>
        </div>
      </section>

      <div className="space-y-6">
        {reviews.map(review => (
          <div key={review.id} className={`rounded-[2rem] overflow-hidden ${review.image ? 'bg-surface-container-low' : 'bg-surface-container-lowest border border-outline-variant/20 shadow-sm p-8'}`}>
            {review.image && (
              <div className="relative h-48 w-full">
                <img src={review.image} alt="Dish" className="w-full h-full object-cover" />
                <div className="absolute top-4 start-4 bg-surface-container-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm">
                  <Star className="w-4 h-4 fill-primary text-primary" />
                  <span className="font-bold text-sm text-on-surface">{review.rating.toFixed(1)}</span>
                </div>
              </div>
            )}

            <div className={review.image ? 'p-6' : ''}>
              {!review.image && (
                <div className="flex items-center gap-1 mb-4 text-primary">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-primary' : 'text-outline-variant'}`} />
                  ))}
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-headline font-bold text-lg text-on-surface">{review.userName}</h3>
                  <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">{review.date}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold">
                  {review.userInitials}
                </div>
              </div>

              <p className={`text-on-surface-variant leading-relaxed ${review.image ? 'italic' : 'text-sm'}`}>
                "{review.comment}"
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <button
          onClick={onWriteReview}
          className="bg-signature-gradient text-white px-8 py-4 rounded-full font-headline font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
        >
          {t('reviews.writeReview')}
        </button>
      </div>
    </div>
  );
};
