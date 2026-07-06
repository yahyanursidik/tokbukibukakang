export type CartStockType = 'preorder' | 'ready_stock';

export type CartItemInput = {
  slug: string;
  title: string;
  price: number;
  coverImage: string;
  stockType: CartStockType;
};

export type CartItem = CartItemInput & {
  quantity: number;
};

export const CART_STORAGE_KEY = 'ibu-kakang-cart';
export const CART_UPDATED_EVENT = 'ibu-kakang-cart-updated';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const sanitizeQuantity = (quantity: unknown) => {
  const parsed = Number(quantity);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.min(99, Math.floor(parsed)));
};

const isCartStockType = (stockType: unknown): stockType is CartStockType =>
  stockType === 'preorder' || stockType === 'ready_stock';

const sanitizeCartItem = (item: Partial<CartItem>): CartItem | null => {
  if (
    typeof item.slug !== 'string' ||
    typeof item.title !== 'string' ||
    typeof item.coverImage !== 'string' ||
    !isCartStockType(item.stockType)
  ) {
    return null;
  }

  const price = Number(item.price);

  if (!Number.isFinite(price) || price < 0) {
    return null;
  }

  return {
    slug: item.slug,
    title: item.title,
    price,
    coverImage: item.coverImage,
    stockType: item.stockType,
    quantity: sanitizeQuantity(item.quantity)
  };
};

const emitCartUpdated = () => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
};

export const readCart = (): CartItem[] => {
  if (!isBrowser()) {
    return [];
  }

  const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);

  if (!rawCart) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawCart);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => sanitizeCartItem(item))
      .filter((item): item is CartItem => item !== null);
  } catch {
    return [];
  }
};

export const writeCart = (items: CartItem[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  emitCartUpdated();
};

export const getTotalItems = (items = readCart()) =>
  items.reduce((total, item) => total + item.quantity, 0);

export const getSubtotal = (items = readCart()) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0);

export const addToCart = (item: CartItemInput, quantity = 1) => {
  const items = readCart();
  const existingItem = items.find((cartItem) => cartItem.slug === item.slug);

  if (existingItem) {
    existingItem.quantity = sanitizeQuantity(existingItem.quantity + quantity);
  } else {
    items.push({
      ...item,
      quantity: sanitizeQuantity(quantity)
    });
  }

  writeCart(items);
  return items;
};

export const updateCartItemQuantity = (slug: string, quantity: number) => {
  const items = readCart()
    .map((item) => (item.slug === slug ? { ...item, quantity: sanitizeQuantity(quantity) } : item))
    .filter((item) => item.quantity > 0);

  writeCart(items);
  return items;
};

export const removeCartItem = (slug: string) => {
  const items = readCart().filter((item) => item.slug !== slug);

  writeCart(items);
  return items;
};

export const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
