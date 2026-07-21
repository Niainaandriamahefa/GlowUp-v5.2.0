// Versets King James (domaine public) utilisés pour la génération automatique,
// avec une traduction française approximative fournie pour affichage optionnel.
export const VERSE_BANK: { text: string; reference: string; translation_fr: string }[] = [
  {
    text: 'I can do all things through Christ which strengtheneth me.',
    reference: 'Philippians 4:13',
    translation_fr: 'Je puis tout par celui qui me fortifie.',
  },
  {
    text: 'The Lord is my shepherd; I shall not want.',
    reference: 'Psalm 23:1',
    translation_fr: "L'Éternel est mon berger : je ne manquerai de rien.",
  },
  {
    text: 'Trust in the Lord with all thine heart; and lean not unto thine own understanding.',
    reference: 'Proverbs 3:5',
    translation_fr: "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta propre intelligence.",
  },
  {
    text: 'For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil.',
    reference: 'Jeremiah 29:11',
    translation_fr: "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur.",
  },
  {
    text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed.',
    reference: 'Joshua 1:9',
    translation_fr: "Fortifie-toi et prends courage : ne t'effraie point et ne t'épouvante point.",
  },
  {
    text: 'And we know that all things work together for good to them that love God.',
    reference: 'Romans 8:28',
    translation_fr: "Nous savons que toutes choses concourent au bien de ceux qui aiment Dieu.",
  },
  {
    text: 'Cast thy burden upon the Lord, and he shall sustain thee.',
    reference: 'Psalm 55:22',
    translation_fr: "Remets ton sort à l'Éternel, et il te soutiendra.",
  },
  {
    text: 'Delight thyself also in the Lord; and he shall give thee the desires of thine heart.',
    reference: 'Psalm 37:4',
    translation_fr: "Fais de l'Éternel tes délices, et il te donnera ce que ton cœur désire.",
  },
  {
    text: 'This is the day which the Lord hath made; we will rejoice and be glad in it.',
    reference: 'Psalm 118:24',
    translation_fr: "C'est ici la journée que l'Éternel a faite : qu'elle soit pour nous un sujet d'allégresse.",
  },
  {
    text: 'Be not weary in well doing: for in due season we shall reap, if we faint not.',
    reference: 'Galatians 6:9',
    translation_fr: "Ne nous lassons pas de faire le bien ; car nous moissonnerons au temps convenable, si nous ne nous relâchons pas.",
  },
  {
    text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God.',
    reference: 'Isaiah 41:10',
    translation_fr: "Ne crains rien, car je suis avec toi ; ne t'inquiète pas, car je suis ton Dieu.",
  },
  {
    text: 'Give thanks unto the Lord; for he is good: for his mercy endureth for ever.',
    reference: '1 Chronicles 16:34',
    translation_fr: "Louez l'Éternel, car il est bon, car sa miséricorde dure à toujours.",
  },
];

export function verseForDate(dateISO: string) {
  const dayOfYear = Math.floor(
    (new Date(dateISO + 'T00:00:00').getTime() - new Date(dateISO.slice(0, 4) + '-01-01').getTime()) / 86400000
  );
  return VERSE_BANK[dayOfYear % VERSE_BANK.length];
}
