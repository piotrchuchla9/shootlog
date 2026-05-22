export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// "14-15.09.2025", "14.09.2025", "30.09-01.10.2025"
export function parseDateRange(str: string): { start: Date; end: Date } | null {
  str = str.trim();

  // Format: DD.MM.YYYY - single day
  const single = str.match(/^(\d{1,2})\.(\d{2})\.(\d{4})$/);
  if (single) {
    const d = new Date(`${single[3]}-${single[2]}-${single[1].padStart(2, '0')}T08:00:00Z`);
    const e = new Date(`${single[3]}-${single[2]}-${single[1].padStart(2, '0')}T18:00:00Z`);
    if (isNaN(d.getTime())) return null;
    return { start: d, end: e };
  }

  // Format: DD-DD.MM.YYYY — two days, same month
  const sameMonth = str.match(/^(\d{1,2})-(\d{1,2})\.(\d{2})\.(\d{4})$/);
  if (sameMonth) {
    const start = new Date(`${sameMonth[4]}-${sameMonth[3]}-${sameMonth[1].padStart(2, '0')}T08:00:00Z`);
    const end = new Date(`${sameMonth[4]}-${sameMonth[3]}-${sameMonth[2].padStart(2, '0')}T18:00:00Z`);
    if (isNaN(start.getTime())) return null;
    return { start, end };
  }

  // Format: DD.MM-DD.MM.YYYY — spanning months
  const spanMonth = str.match(/^(\d{1,2})\.(\d{2})-(\d{1,2})\.(\d{2})\.(\d{4})$/);
  if (spanMonth) {
    const start = new Date(`${spanMonth[5]}-${spanMonth[2]}-${spanMonth[1].padStart(2, '0')}T08:00:00Z`);
    const end = new Date(`${spanMonth[5]}-${spanMonth[4]}-${spanMonth[3].padStart(2, '0')}T18:00:00Z`);
    if (isNaN(start.getTime())) return null;
    return { start, end };
  }

  return null;
}

// "L.II", "L2", "II", "Level 2" → 2
export function parseLevelFromText(str: string): number {
  str = str.trim().toUpperCase();
  const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

  const digit = str.match(/L\.?(\d)/);
  if (digit) return Number(digit[1]);

  const romanMatch = str.match(/L\.?(I{1,3}V?|IV|V)/);
  if (romanMatch) return roman[romanMatch[1]] ?? 1;

  return 1;
}

export function guessDiscipline(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('strzelb') || n.includes('shotgun')) return 'shotgun';
  if (n.includes('pcc') || n.includes('carbine'))     return 'pcc';
  if (n.includes('rifle') || n.includes('karabin'))   return 'rifle';
  if (n.includes('air') || n.includes('action air'))  return 'air';
  return 'pistol';
}

// Best-effort voivodeship detection from location string
const VOIVODESHIPS: [string, string][] = [
  ['małopolsk', 'malopolskie'],
  ['krakow', 'malopolskie'], ['kraków', 'malopolskie'],
  ['mazowieckie', 'mazowieckie'], ['warszawa', 'mazowieckie'], ['warsaw', 'mazowieckie'],
  ['śląsk', 'slaskie'], ['slask', 'slaskie'], ['katowice', 'slaskie'],
  ['wielkopolsk', 'wielkopolskie'], ['poznań', 'wielkopolskie'], ['poznan', 'wielkopolskie'],
  ['dolnośląsk', 'dolnoslaskie'], ['wrocław', 'dolnoslaskie'], ['wroclaw', 'dolnoslaskie'],
  ['łódź', 'lodzkie'], ['lodz', 'lodzkie'], ['łódzk', 'lodzkie'],
  ['pomorsk', 'pomorskie'], ['gdańsk', 'pomorskie'], ['gdansk', 'pomorskie'],
  ['kujawsko', 'kujawsko-pomorskie'], ['bydgoszcz', 'kujawsko-pomorskie'],
  ['warmińsko', 'warminsko-mazurskie'], ['olsztyn', 'warminsko-mazurskie'],
  ['podlaskie', 'podlaskie'], ['białystok', 'podlaskie'], ['bialystok', 'podlaskie'],
  ['lubelskie', 'lubelskie'], ['lublin', 'lubelskie'],
  ['podkarpackie', 'podkarpackie'], ['rzeszów', 'podkarpackie'], ['rzeszow', 'podkarpackie'],
  ['świętokrzysk', 'swietokrzyskie'], ['kielce', 'swietokrzyskie'],
  ['opolskie', 'opolskie'], ['opole', 'opolskie'],
  ['lubuskie', 'lubuskie'], ['zielona góra', 'lubuskie'],
  ['zachodniopomorsk', 'zachodniopomorskie'], ['szczecin', 'zachodniopomorskie'],
];

export function guessVoivodeship(location: string): string | undefined {
  const l = location.toLowerCase();
  for (const [keyword, voiv] of VOIVODESHIPS) {
    if (l.includes(keyword)) return voiv;
  }
  return undefined;
}
