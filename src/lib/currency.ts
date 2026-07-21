import type { Currency } from '@/types';

// Toutes les sommes sont saisies et stockées en Ariary (MGA) — devise par
// défaut de l'app. L'affichage est ensuite converti à la volée selon la
// devise choisie dans Réglages, sans jamais réécrire les montants stockés.
export const CURRENCY_RATES: Record<Currency, number> = {
  MGA: 1,
  EUR: 0.00019,
  USD: 0.00021,
};

export const CURRENCY_LABEL: Record<Currency, string> = {
  MGA: 'Ariary',
  EUR: 'Euro',
  USD: 'Dollar',
};

export const CURRENCY_LOCALE: Record<Currency, string> = {
  MGA: 'fr-MG',
  EUR: 'fr-FR',
  USD: 'en-US',
};

export function convertFromMga(amountInMga: number, target: Currency): number {
  return amountInMga * CURRENCY_RATES[target];
}

/** Formate un montant stocké en MGA dans la devise d'affichage choisie. */
export function formatAmount(amountInMga: number, currency: Currency): string {
  const converted = convertFromMga(amountInMga, currency);
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'MGA' ? 0 : 2,
    }).format(converted);
  } catch {
    // Ariary n'est pas toujours reconnu par Intl selon l'environnement : repli manuel.
    return `${Math.round(converted).toLocaleString('fr-FR')} Ar`;
  }
}
