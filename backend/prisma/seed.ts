import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const events = [
  {
    source: 'manual',
    externalId: 'seed_cracow_open_2025',
    name: 'Cracow Open 2025 IPSC L3',
    discipline: 'pistol',
    level: 3,
    location: 'Strzelnica BigGun, Kraków',
    city: 'Kraków',
    voivodeship: 'malopolskie',
    lat: 50.0647,
    lng: 19.9450,
    startDate: new Date('2025-09-14T08:00:00Z'),
    endDate: new Date('2025-09-15T18:00:00Z'),
    registrationUrl: 'https://practiscore.com/cracow-open-2025',
    registrationOpen: new Date('2025-07-01T20:00:00Z'),
    registrationClose: new Date('2025-09-01T20:00:00Z'),
    maxShooters: 100,
    currentShooters: 64,
    entryFee: 28000,
    currency: 'PLN',
    organizerName: 'IPSC Region Małopolska',
    status: 'upcoming',
  },
  {
    source: 'manual',
    externalId: 'seed_warsaw_open_2025',
    name: 'Warsaw Open 2025 IPSC L2',
    discipline: 'pistol',
    level: 2,
    location: 'Strzelnica Varsovia, Warszawa',
    city: 'Warszawa',
    voivodeship: 'mazowieckie',
    lat: 52.2297,
    lng: 21.0122,
    startDate: new Date('2025-08-02T09:00:00Z'),
    endDate: new Date('2025-08-03T17:00:00Z'),
    registrationUrl: 'https://practiscore.com/warsaw-open-2025',
    registrationOpen: new Date('2025-06-01T18:00:00Z'),
    registrationClose: new Date('2025-07-25T18:00:00Z'),
    maxShooters: 60,
    currentShooters: 45,
    entryFee: 18000,
    currency: 'PLN',
    organizerName: 'KS Varsovia',
    status: 'upcoming',
  },
  {
    source: 'manual',
    externalId: 'seed_silesia_shotgun_2025',
    name: 'Silesia Shotgun Cup 2025 L2',
    discipline: 'shotgun',
    level: 2,
    location: 'Strzelnica Katowice, Katowice',
    city: 'Katowice',
    voivodeship: 'slaskie',
    lat: 50.2649,
    lng: 19.0238,
    startDate: new Date('2025-10-05T09:00:00Z'),
    endDate: new Date('2025-10-05T18:00:00Z'),
    registrationUrl: 'https://practiscore.com/silesia-shotgun-2025',
    registrationOpen: new Date('2025-08-15T18:00:00Z'),
    registrationClose: new Date('2025-09-28T18:00:00Z'),
    maxShooters: 40,
    currentShooters: 12,
    entryFee: 15000,
    currency: 'PLN',
    organizerName: 'KS Sigma Śląsk',
    status: 'upcoming',
  },
  {
    source: 'manual',
    externalId: 'seed_gdansk_pcc_2025',
    name: 'Trójmiejski PCC Open 2025 L1',
    discipline: 'pcc',
    level: 1,
    location: 'Strzelnica Trójmiejska, Gdańsk',
    city: 'Gdańsk',
    voivodeship: 'pomorskie',
    lat: 54.3520,
    lng: 18.6466,
    startDate: new Date('2025-07-12T10:00:00Z'),
    endDate: new Date('2025-07-12T17:00:00Z'),
    registrationUrl: 'https://practiscore.com/trojmiejski-pcc-2025',
    registrationOpen: new Date('2025-05-20T18:00:00Z'),
    registrationClose: new Date('2025-07-05T18:00:00Z'),
    maxShooters: 30,
    currentShooters: 30,
    entryFee: 12000,
    currency: 'PLN',
    organizerName: 'KS Neptun Gdańsk',
    status: 'finished',
  },
];

async function main() {
  console.log('Seeding database...');

  for (const event of events) {
    await prisma.event.upsert({
      where: { externalId_source: { externalId: event.externalId, source: event.source } },
      create: event,
      update: {},
    });
  }

  console.log(`Seeded ${events.length} events.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
