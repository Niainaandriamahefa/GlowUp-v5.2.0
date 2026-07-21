import { useGlowUpData } from '@/context/GlowUpContext';
import { formatAmount } from '@/lib/currency';
import type { Currency } from '@/types';

/**
 * Retourne une fonction de formatage monétaire liée à la devise choisie par
 * l'utilisateur dans Réglages. Les montants restent stockés en Ariary (MGA) ;
 * seul l'affichage change instantanément quand la devise est modifiée.
 */
export function useCurrencyFormatter() {
  const { profile } = useGlowUpData();
  const currency: Currency = profile?.currency ?? 'MGA';

  return {
    currency,
    format: (amountInMga: number) => formatAmount(amountInMga, currency),
  };
}
