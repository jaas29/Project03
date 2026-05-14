import { HigherLowerPlayer } from '../models/HigherLowerPlayer';

const SEED_DATA = [
  { name: 'Kylian Mbappé',           club: 'Real Madrid',        nationality: 'France',    position: 'Forward',    valueMEur: 180 },
  { name: 'Erling Haaland',          club: 'Manchester City',    nationality: 'Norway',    position: 'Forward',    valueMEur: 180 },
  { name: 'Vinicius Jr.',            club: 'Real Madrid',        nationality: 'Brazil',    position: 'Forward',    valueMEur: 180 },
  { name: 'Jude Bellingham',         club: 'Real Madrid',        nationality: 'England',   position: 'Midfielder', valueMEur: 180 },
  { name: 'Bukayo Saka',             club: 'Arsenal',            nationality: 'England',   position: 'Winger',     valueMEur: 160 },
  { name: 'Florian Wirtz',           club: 'Bayer Leverkusen',   nationality: 'Germany',   position: 'Midfielder', valueMEur: 150 },
  { name: 'Rodri',                   club: 'Manchester City',    nationality: 'Spain',     position: 'Midfielder', valueMEur: 150 },
  { name: 'Phil Foden',              club: 'Manchester City',    nationality: 'England',   position: 'Midfielder', valueMEur: 150 },
  { name: 'Pedri',                   club: 'Barcelona',          nationality: 'Spain',     position: 'Midfielder', valueMEur: 120 },
  { name: 'Lamine Yamal',            club: 'Barcelona',          nationality: 'Spain',     position: 'Winger',     valueMEur: 120 },
  { name: 'Jamal Musiala',           club: 'Bayern Munich',      nationality: 'Germany',   position: 'Midfielder', valueMEur: 130 },
  { name: 'Declan Rice',             club: 'Arsenal',            nationality: 'England',   position: 'Midfielder', valueMEur: 120 },
  { name: 'Nico Williams',           club: 'Athletic Bilbao',    nationality: 'Spain',     position: 'Winger',     valueMEur: 100 },
  { name: 'Raphinha',                club: 'Barcelona',          nationality: 'Brazil',    position: 'Winger',     valueMEur: 90  },
  { name: 'Gavi',                    club: 'Barcelona',          nationality: 'Spain',     position: 'Midfielder', valueMEur: 90  },
  { name: 'Harry Kane',              club: 'Bayern Munich',      nationality: 'England',   position: 'Forward',    valueMEur: 90  },
  { name: 'Trent Alexander-Arnold',  club: 'Real Madrid',        nationality: 'England',   position: 'Defender',   valueMEur: 80  },
  { name: 'Victor Osimhen',          club: 'Napoli',             nationality: 'Nigeria',   position: 'Forward',    valueMEur: 75  },
  { name: 'Mohamed Salah',           club: 'Liverpool',          nationality: 'Egypt',     position: 'Forward',    valueMEur: 60  },
  { name: 'Marcus Rashford',         club: 'Manchester United',  nationality: 'England',   position: 'Forward',    valueMEur: 50  },
  { name: 'Achraf Hakimi',           club: 'PSG',                nationality: 'Morocco',   position: 'Defender',   valueMEur: 70  },
  { name: 'Rúben Dias',              club: 'Manchester City',    nationality: 'Portugal',  position: 'Defender',   valueMEur: 75  },
  { name: 'William Saliba',          club: 'Arsenal',            nationality: 'France',    position: 'Defender',   valueMEur: 80  },
  { name: 'Alisson Becker',          club: 'Liverpool',          nationality: 'Brazil',    position: 'Goalkeeper', valueMEur: 50  },
  { name: 'Manuel Neuer',            club: 'Bayern Munich',      nationality: 'Germany',   position: 'Goalkeeper', valueMEur: 10  },
  { name: 'Lionel Messi',            club: 'Inter Miami',        nationality: 'Argentina', position: 'Forward',    valueMEur: 25  },
  { name: 'Cristiano Ronaldo',       club: 'Al Nassr',           nationality: 'Portugal',  position: 'Forward',    valueMEur: 15  },
  { name: 'Neymar Jr.',              club: 'Al Hilal',           nationality: 'Brazil',    position: 'Forward',    valueMEur: 20  },
  { name: 'Antoine Griezmann',       club: 'Atlético Madrid',    nationality: 'France',    position: 'Forward',    valueMEur: 30  },
  { name: 'Kevin De Bruyne',         club: 'Manchester City',    nationality: 'Belgium',   position: 'Midfielder', valueMEur: 40  },
];

export async function seedHigherLowerPlayers(): Promise<void> {
  const count = await HigherLowerPlayer.countDocuments();
  if (count >= SEED_DATA.length) return;

  for (const player of SEED_DATA) {
    await HigherLowerPlayer.updateOne({ name: player.name }, { $setOnInsert: player }, { upsert: true });
  }
  console.log(`[seed] HigherLowerPlayer collection seeded (${SEED_DATA.length} players)`);
}
