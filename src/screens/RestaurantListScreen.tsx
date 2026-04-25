import { useState, useEffect } from 'react';
import { Search, Star, MapPin, Utensils } from 'lucide-react';
import { motion } from 'motion/react';

interface Restaurant {
  _id: string;
  name: string;
  logo?: string;
  address?: string;
  status: 'active' | 'inactive';
  averageRating: number;
}

interface Props {
  onSelect: (restaurant: { _id: string; name: string; logo?: string }) => void;
}

export const RestaurantListScreen = ({ onSelect }: Props) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/restaurants/public')
      .then(r => r.ok ? r.json() : [])
      .then(setRestaurants)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface-dim">
      <div className="max-w-md mx-auto bg-surface min-h-screen">

        {/* Header */}
        <div className="px-6 pt-14 pb-6 bg-surface">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-headline font-extrabold tracking-tight">Menu QR</h1>
            </div>
            <p className="text-on-surface-variant text-sm font-medium ml-12">Discover great restaurants</p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative mt-5"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search restaurants..."
              className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/40 transition-all"
            />
          </motion.div>
        </div>

        {/* Grid */}
        <div className="px-6 pb-12">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-52 bg-surface-container-low rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Utensils className="w-12 h-12 mx-auto text-on-surface-variant/20" />
              <p className="font-bold text-on-surface-variant">
                {search ? 'No restaurants found' : 'No restaurants available yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map((r, i) => {
                const isActive = r.status === 'active';
                return (
                  <motion.button
                    key={r._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => isActive && onSelect({ _id: r._id, name: r.name, logo: r.logo })}
                    disabled={!isActive}
                    className={`relative flex flex-col rounded-3xl overflow-hidden text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-surface-container-low hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                        : 'bg-surface-container-low opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {/* Logo / cover */}
                    <div className="h-32 w-full bg-surface-container-high flex items-center justify-center overflow-hidden">
                      {r.logo ? (
                        <img src={r.logo} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-extrabold">
                          {r.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    {!isActive && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                        <span className="text-[9px] font-bold text-white uppercase tracking-widest">Closed</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-4 space-y-1.5">
                      <h3 className="font-headline font-bold text-sm leading-tight line-clamp-1">{r.name}</h3>

                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        <Star className={`w-3 h-3 ${r.averageRating > 0 ? 'fill-amber-400 text-amber-400' : 'text-on-surface-variant/30'}`} />
                        <span className="text-[11px] font-bold text-on-surface-variant">
                          {r.averageRating > 0 ? r.averageRating.toFixed(1) : 'New'}
                        </span>
                      </div>

                      {/* Address */}
                      {r.address && (
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-on-surface-variant/40 mt-0.5 shrink-0" />
                          <span className="text-[10px] text-on-surface-variant/60 line-clamp-1">{r.address}</span>
                        </div>
                      )}

                      {/* Open/Closed dot */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-on-surface-variant/30'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-on-surface-variant/40'}`}>
                          {isActive ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
