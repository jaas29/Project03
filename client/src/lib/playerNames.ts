const CANONICAL_PLAYERS = [
  'Bukayo Saka',
  'Kylian Mbappe',
  'Erling Haaland',
  'Vinicius Jr.',
  'Jude Bellingham',
  'Luka Modric',
  'Cristiano Ronaldo',
  'Lionel Messi',
  'Neymar',
  'Mohamed Salah',
  'Kevin De Bruyne',
  'Rodri',
  'Pedri',
  'Gavi',
  'Jamal Musiala',
  'Harry Kane',
  'Robert Lewandowski',
  'Phil Foden',
  'Declan Rice',
  'Martin Odegaard',
  'Luis Diaz',
  'Trent Alexander-Arnold',
  'Alisson Becker',
  'Virgil van Dijk',
  'Alvaro Morata',
  'Mario Balotelli',
  'Kaka',
  'Gianluigi Buffon',
  'Thomas Muller',
  'Raheem Sterling',
  'Ilkay Gundogan',
  'Thierry Henry',
  'Wayne Rooney',
  'Frank Lampard',
  'Steven Gerrard',
  'Sergio Ramos',
  'Karim Benzema',
  'Toni Kroos',
  'Casemiro',
  'Sadio Mane',
  'Riyad Mahrez',
  'Son Heung-min',
  'Victor Osimhen',
  'Raphinha',
  'Nico Williams',
  'Florian Wirtz',
].sort();

const ALIASES: Record<string, string> = {
  saka: 'Bukayo Saka',
  mbappe: 'Kylian Mbappe',
  haaland: 'Erling Haaland',
  vini: 'Vinicius Jr.',
  vinicius: 'Vinicius Jr.',
  bellingham: 'Jude Bellingham',
  jude: 'Jude Bellingham',
  modric: 'Luka Modric',
  ronaldo: 'Cristiano Ronaldo',
  cr7: 'Cristiano Ronaldo',
  messi: 'Lionel Messi',
  neymar: 'Neymar',
  salah: 'Mohamed Salah',
  kdb: 'Kevin De Bruyne',
  debruyne: 'Kevin De Bruyne',
  rodri: 'Rodri',
  pedri: 'Pedri',
  gavi: 'Gavi',
  musiala: 'Jamal Musiala',
  kane: 'Harry Kane',
  lewandowski: 'Robert Lewandowski',
  foden: 'Phil Foden',
  rice: 'Declan Rice',
  odegaard: 'Martin Odegaard',
  diaz: 'Luis Diaz',
  trent: 'Trent Alexander-Arnold',
  alisson: 'Alisson Becker',
  vvd: 'Virgil van Dijk',
  morata: 'Alvaro Morata',
  balotelli: 'Mario Balotelli',
  kaka: 'Kaka',
  buffon: 'Gianluigi Buffon',
  muller: 'Thomas Muller',
  sterling: 'Raheem Sterling',
  gundogan: 'Ilkay Gundogan',
  henry: 'Thierry Henry',
  rooney: 'Wayne Rooney',
  lampard: 'Frank Lampard',
  gerrard: 'Steven Gerrard',
  ramos: 'Sergio Ramos',
  benzema: 'Karim Benzema',
  kroos: 'Toni Kroos',
  casemiro: 'Casemiro',
  mane: 'Sadio Mane',
  mahrez: 'Riyad Mahrez',
  son: 'Son Heung-min',
  osimhen: 'Victor Osimhen',
  raphinha: 'Raphinha',
  wirtz: 'Florian Wirtz',
};

export function canonicalPlayerName(input: string, extraPlayers: string[] = []): string {
  const playerList = buildPlayerList(extraPlayers);
  const normalized = normalizePlayerName(input);
  if (ALIASES[normalized]) return ALIASES[normalized];

  const exact = playerList.find((name) => normalizePlayerName(name) === normalized);
  if (exact) return exact;

  const lastNameMatch = playerList.find((name) => {
    const parts = normalizePlayerName(name).split(' ');
    return parts.at(-1) === normalized;
  });
  return lastNameMatch ?? input.trim();
}

export function playerNameSuggestions(input: string, extraPlayers: string[] = []): string[] {
  const playerList = buildPlayerList(extraPlayers);
  const normalized = normalizePlayerName(input);
  if (!normalized) return playerList.slice(0, 8);

  return playerList
    .filter((name) => normalizePlayerName(name).includes(normalized))
    .slice(0, 8);
}

function buildPlayerList(extraPlayers: string[]): string[] {
  return [...new Set([...extraPlayers.filter(Boolean), ...CANONICAL_PLAYERS])].sort();
}

function normalizePlayerName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}
