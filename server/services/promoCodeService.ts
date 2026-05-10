import { PromoCode } from '../models/PromoCode';

export const getPromoCodes = (restaurantId: string) =>
  PromoCode.find({ restaurantId }).sort({ createdAt: -1 });

export const createPromoCode = (data: object, restaurantId: string) =>
  PromoCode.create({ ...data, restaurantId });

export const deletePromoCode = (id: string, restaurantId: string) =>
  PromoCode.findOneAndDelete({ _id: id, restaurantId });

export const togglePromoCode = (id: string, restaurantId: string, isActive: boolean) =>
  PromoCode.findOneAndUpdate({ _id: id, restaurantId }, { isActive }, { returnDocument: 'after' });

export const validatePromoCode = async (code: string, restaurantId: string, subtotal: number) => {
  const promo = await PromoCode.findOne({ code: code.toUpperCase(), restaurantId, isActive: true });

  if (!promo) return { valid: false, message: 'Invalid or expired promo code' };

  if (promo.expiryDate && new Date() > promo.expiryDate) {
    return { valid: false, message: 'This promo code has expired' };
  }

  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return { valid: false, message: 'This promo code has reached its usage limit' };
  }

  const discountAmount =
    promo.discountType === 'percentage'
      ? parseFloat((subtotal * (promo.discountValue / 100)).toFixed(2))
      : parseFloat(Math.min(promo.discountValue, subtotal).toFixed(2));

  return {
    valid: true,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount,
  };
};

export const applyPromoCode = (code: string, restaurantId: string) =>
  PromoCode.findOneAndUpdate(
    { code: code.toUpperCase(), restaurantId },
    { $inc: { usedCount: 1 } }
  );
