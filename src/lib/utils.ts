import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// IMPORTANT : on formate toujours la date à partir des composants LOCAUX
// (getFullYear/getMonth/getDate), jamais via toISOString() qui convertit en
// UTC et décale la date d'un jour pour les fuseaux horaires positifs (ex :
// Madagascar UTC+3) autour de minuit. C'est ce qui causait le bug des
// boutons "jour suivant / précédent" dans le Planning.
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return isoDate(new Date());
}

/** Ajoute (ou retire) des jours à une date ISO "YYYY-MM-DD", en restant en heure locale. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

/** Ajoute (ou retire) des semaines à une date ISO, en restant en heure locale. */
export function addWeeksISO(iso: string, weeks: number): string {
  return addDaysISO(iso, weeks * 7);
}

/** Lundi de la semaine contenant la date ISO donnée. */
export function startOfWeekISO(iso: string = todayISO()): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return isoDate(date);
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatCurrency(amount: number): string {
  // Conservé pour compatibilité ; préférer useCurrencyFormatter() pour tout
  // affichage monétaire lié aux préférences de l'utilisateur.
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
