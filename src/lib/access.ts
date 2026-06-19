export const canAddToCartRole = (role?: string | null) => {
  return role !== 'admin' && role !== 'merchant';
};
