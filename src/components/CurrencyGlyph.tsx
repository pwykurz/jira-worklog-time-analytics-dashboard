import React from 'react';
import { Banknote, DollarSign, Euro } from 'lucide-react';

interface CurrencyGlyphProps {
  currency?: string;
  className?: string;
}

export const CurrencyGlyph: React.FC<CurrencyGlyphProps> = ({ currency = 'USD', className }) => {
  const code = currency.trim().toUpperCase();
  if (code === 'USD') {
    return <DollarSign className={className} />;
  }
  if (code === 'EUR') {
    return <Euro className={className} />;
  }
  return <Banknote className={className} />;
};
