export type PriceInput = {
  price: number;
  originalPrice?: number | null;
};

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);

export const hasDiscountPrice = (book: PriceInput) =>
  typeof book.originalPrice === 'number' && book.originalPrice > book.price;

export const getSavingsAmount = (book: PriceInput) =>
  hasDiscountPrice(book) ? Number(book.originalPrice) - book.price : 0;

export const getSavingsPercent = (book: PriceInput) => {
  if (!hasDiscountPrice(book)) {
    return 0;
  }

  return Math.round((getSavingsAmount(book) / Number(book.originalPrice)) * 100);
};
