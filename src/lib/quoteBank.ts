export const QUOTE_BANK: { text: string; author: string }[] = [
  { text: "Le succès, c'est se déplacer d'échec en échec sans perdre son enthousiasme.", author: 'Winston Churchill' },
  { text: "La discipline est le pont entre les objectifs et les résultats.", author: 'Jim Rohn' },
  { text: "Ce que tu fais aujourd'hui peut améliorer tous tes lendemains.", author: 'Ralph Marston' },
  { text: "Le seul moyen de faire du bon travail est d'aimer ce que l'on fait.", author: 'Steve Jobs' },
  { text: "N'attends pas. Le temps ne sera jamais tout à fait bon.", author: 'Napoleon Hill' },
  { text: "Petit à petit, l'oiseau fait son nid.", author: 'Proverbe' },
  { text: "La motivation te lance, l'habitude te fait continuer.", author: 'Jim Ryun' },
  { text: "Tu n'as pas besoin d'être extrême, juste constant.", author: 'Anonyme' },
];

export function quoteForDate(dateISO: string) {
  const dayOfYear = Math.floor(
    (new Date(dateISO + 'T00:00:00').getTime() - new Date(dateISO.slice(0, 4) + '-01-01').getTime()) / 86400000
  );
  return QUOTE_BANK[dayOfYear % QUOTE_BANK.length];
}
