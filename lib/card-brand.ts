export function detectCardBrand(cardNumber: string): string {
  if (/^4/.test(cardNumber)) return "Visa";
  if (/^5[1-5]/.test(cardNumber)) return "Mastercard";
  if (/^3[47]/.test(cardNumber)) return "Amex";
  if (/^6(?:011|5)/.test(cardNumber)) return "Discover";
  return "Card";
}
