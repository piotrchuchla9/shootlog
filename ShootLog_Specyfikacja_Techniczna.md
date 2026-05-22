# ShootLog — Specyfikacja Techniczna MVP

> Aplikacja mobilna dla zawodników strzelectwa sportowego (IPSC / PZSS)
> Wersja 1.0 | Przekazana do implementacji w Claude Code

---

## 0. Kontekst i cel projektu

ShootLog to aplikacja mobilna (iOS + Android) dla zawodników strzelectwa sportowego w Polsce i regionie CEE. Rozwiązuje kluczowy problem: brak jednego miejsca, gdzie zawodnik znajdzie wszystkie zawody, wyniki i historię swoich startów.

**Aktualny stan rynku:**
- IPSC Polska (ipsc-pl.org), PZSS (pzss.org.pl), regionalne związki — każdy ma osobny kalendarz
- Brak mobilnej apki po polsku dla tej społeczności
- PractiScore.com to globalny standard, ale ma fatalne UX i brak lokalizacji
- Nieoficjalny agregator ipsc.kksprecyzja.org.pl to prymitywna tabelka HTML

**Grupy docelowe:**
- Zawodnicy IPSC Polska (~3 000 aktywnych, płacą 180 zł/rok składki)
- Zawodnicy PZSS (strzelectwo olimpijskie, czarnoproch, strzelba)
- Organizatorzy zawodów — potrzebują narzędzia do zarządzania L1
- Region CEE (Czechy ~1 100, Słowacja, Węgry, kraje bałtyckie) jako kolejny etap

---

## 1. Architektura systemu

### 1.1 Diagram warstw

```
┌─────────────────────────────────────────────┐
│           Mobile App (React Native)          │
│        iOS + Android, Expo SDK 50+           │
└──────────────────────┬──────────────────────┘
                       │ REST API (JSON)
┌──────────────────────▼──────────────────────┐
│         API Gateway (Node.js + Fastify)      │
│     Auth, rate limiting, CORS, routing       │
└───────┬─────────────────────────┬───────────┘
        │                         │
┌───────▼───────┐       ┌─────────▼──────────┐
│   Services    │       │     Scheduler      │
│ Auth, Matcher │       │  Cron + Scrapers   │
│  Notifier     │       │  ipsc_pl, pzss,    │
└───────┬───────┘       │  practiscore       │
        │               └─────────┬──────────┘
┌───────▼───────────────────────▼───────────┐
│              Data Store                    │
│   PostgreSQL 16 (dane)  +  Redis 7 (cache) │
└────────────────────────────────────────────┘
```

### 1.2 Stos technologiczny

| Komponent | Technologia | Uzasadnienie |
|---|---|---|
| Aplikacja mobilna | React Native 0.73+ z Expo SDK 50+ | Jeden kod na iOS i Android, duży ekosystem |
| Nawigacja | Expo Router (file-based) | Standard w Expo, głębokie linkowanie |
| State management | Zustand + React Query (TanStack Query) | Lekki, prosty, dobry cache HTTP |
| UI komponenty | React Native Paper / własne | Material Design 3, dostępność |
| Backend API | Node.js 20 LTS + Fastify | Szybki, małe zużycie RAM, TypeScript-friendly |
| ORM | Prisma | Bezpieczne migracje, TypeScript types auto-gen |
| Baza danych | PostgreSQL 16 | Relacje zawody←→wyniki←→zawodnicy |
| Cache | Redis 7 | Cache scrapowanych danych (TTL 1h) |
| Scraper | Node.js + Cheerio + Playwright (fallback) | Cheerio dla HTML, Playwright dla JS-rendered |
| Scheduler | node-cron | Uruchamianie scraperów co X godzin |
| Push notifications | Expo Notifications + FCM/APNs | Powiadomienia o zapisach na zawody |
| Autentykacja | JWT (access 15min + refresh 30 dni) | Stateless, bezpieczny |
| Hosting API | Railway.app lub Render.com | Tani, prosty deploy, darmowy tier na start |
| Hosting DB | Supabase (PostgreSQL managed) | Managed, darmowy tier 500MB, łatwy backup |
| CI/CD | GitHub Actions | Auto-deploy po push na main |
| Monitorowanie | Sentry (błędy) + Umami (analityka) | Oba darmowe dla small projects |
| Monetyzacja | RevenueCat | Obsługuje App Store + Google Play w jednym SDK |

---

## 2. Schemat bazy danych (Prisma)

Plik: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  shooterAlias  String?  // imię i nazwisko do matchowania z wynikami
  ipscNumber    String?  // numer licencji IPSC
  pzssNumber    String?  // numer licencji PZSS
  region        String?  // województwo
  pushToken     String?  // Expo push token
  notifySignup  Boolean  @default(true)
  notifyResults Boolean  @default(true)
  tier          String   @default("free") // free | pro
  createdAt     DateTime @default(now())
  results       Result[]
  savedEvents   UserSavedEvent[]
}

model Event {
  id                String   @id @default(cuid())
  externalId        String?  // ID z PractiScore lub źródła
  source            String   // "practiscore" | "ipsc_pl" | "pzss" | "manual"
  name              String
  discipline        String   // "pistol" | "shotgun" | "pcc" | "rifle" | "air"
  level             Int      // 1-5
  location          String
  city              String?
  voivodeship       String?
  lat               Float?
  lng               Float?
  startDate         DateTime
  endDate           DateTime
  registrationUrl   String?
  registrationOpen  DateTime?
  registrationClose DateTime?
  maxShooters       Int?
  currentShooters   Int?
  entryFee          Int?     // w groszach
  currency          String   @default("PLN")
  organizerName     String?
  status            String   @default("upcoming") // upcoming|ongoing|finished|cancelled
  scrapedAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  results           Result[]
  savedBy           UserSavedEvent[]

  @@unique([externalId, source])
}

model Result {
  id            String  @id @default(cuid())
  eventId       String
  event         Event   @relation(fields: [eventId], references: [id])
  userId        String? // null jeśli zawodnik nie ma konta
  user          User?   @relation(fields: [userId], references: [id])
  shooterName   String
  shooterClub   String?
  division      String  // klasa sprzętowa (Open, Standard, Production...)
  category      String? // Lady, Junior, Senior, Super Senior
  totalScore    Float?
  percentage    Float?  // % max score
  rank          Int?    // miejsce overall
  rankDivision  Int?    // miejsce w klasie
  stagesData    Json?   // szczegóły per etap jako JSON
  createdAt     DateTime @default(now())
}

model UserSavedEvent {
  userId  String
  eventId String
  user    User  @relation(fields: [userId], references: [id])
  event   Event @relation(fields: [eventId], references: [id])
  @@id([userId, eventId])
}

model ScraperLog {
  id         String   @id @default(cuid())
  source     String
  status     String   // success | error
  message    String?
  itemsFound Int      @default(0)
  runAt      DateTime @default(now())
}
```

---

## 3. Backend — REST API

### 3.1 Struktura katalogów

```
backend/
├── src/
│   ├── index.ts              # entry point, Fastify init
│   ├── config.ts             # env variables, constants
│   ├── plugins/              # fastify plugins (auth, cors, rate-limit)
│   ├── routes/
│   │   ├── auth.ts           # POST /auth/register, /auth/login, /auth/refresh
│   │   ├── events.ts         # GET /events, GET /events/:id
│   │   ├── results.ts        # GET /events/:id/results, GET /results/search
│   │   ├── profile.ts        # GET/PUT /profile, GET /profile/history
│   │   └── admin.ts          # POST /admin/scrape (protected)
│   ├── services/
│   │   ├── scrapers/
│   │   │   ├── practiscore.ts
│   │   │   ├── ipsc_pl.ts
│   │   │   └── pzss.ts
│   │   ├── matcher.ts        # dopasowuje wyniki do użytkowników
│   │   ├── notifier.ts       # push notifications
│   │   └── scheduler.ts      # cron jobs
│   └── lib/
│       ├── prisma.ts         # singleton klienta Prisma
│       └── redis.ts          # singleton klienta Redis
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.example
└── package.json
```

### 3.2 Endpointy API

| Metoda | Endpoint | Auth | Opis |
|---|---|---|---|
| POST | /auth/register | — | Rejestracja użytkownika |
| POST | /auth/login | — | Logowanie, zwraca access + refresh token |
| POST | /auth/refresh | — | Odświeżenie access tokena |
| GET | /events | optional | Lista zawodów. Query params: `discipline`, `level`, `region`, `dateFrom`, `dateTo`, `status`, `page`, `pageSize` |
| GET | /events/:id | optional | Szczegóły jednego eventu |
| POST | /events/:id/save | required | Zapisz zawody do ulubionych |
| DELETE | /events/:id/save | required | Usuń z ulubionych |
| GET | /events/:id/results | optional | Wyniki danego eventu (paginacja) |
| GET | /results/search?name=X | optional | Szukaj wyników po nazwisku zawodnika |
| GET | /profile | required | Dane profilu zalogowanego użytkownika |
| PUT | /profile | required | Aktualizacja profilu (alias, numery licencji, region) |
| POST | /profile/push-token | required | Zapisz Expo push token |
| GET | /profile/history | required (pro) | Historia startów + statystyki sezonowe |
| GET | /profile/saved-events | required | Zapisane zawody |
| POST | /admin/scrape | admin | Ręczne uruchomienie scrapera |
| GET | /health | — | Health check dla monitoringu |

### 3.3 Przykładowe odpowiedzi API

**GET /events?discipline=pistol&region=malopolskie&status=upcoming**

```json
{
  "data": [
    {
      "id": "clx1234...",
      "name": "Cracow Open 2025 IPSC L3",
      "discipline": "pistol",
      "level": 3,
      "location": "Strzelnica BigGun, Kraków",
      "city": "Kraków",
      "voivodeship": "malopolskie",
      "startDate": "2025-09-14T08:00:00Z",
      "endDate": "2025-09-15T18:00:00Z",
      "entryFee": 28000,
      "currency": "PLN",
      "registrationUrl": "https://practiscore.com/...",
      "registrationOpen": "2025-07-01T20:00:00Z",
      "registrationClose": "2025-09-01T20:00:00Z",
      "status": "upcoming",
      "currentShooters": 64,
      "maxShooters": 100
    }
  ],
  "meta": { "total": 23, "page": 1, "pageSize": 20 }
}
```

**GET /events/:id/results**

```json
{
  "data": [
    {
      "rank": 1,
      "rankDivision": 1,
      "shooterName": "Jan Kowalski",
      "shooterClub": "KS Sigma",
      "division": "Production",
      "category": null,
      "percentage": 98.34,
      "totalScore": 1234.56
    }
  ],
  "meta": { "total": 87, "page": 1, "pageSize": 20 }
}
```

### 3.4 Inicjalizacja serwera

```typescript
// src/index.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { eventsRoutes } from './routes/events';
import { authRoutes } from './routes/auth';
import { profileRoutes } from './routes/profile';
import { resultsRoutes } from './routes/results';
import { initScheduler } from './services/scheduler';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(',') ?? '*'
});
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

app.register(authRoutes, { prefix: '/auth' });
app.register(eventsRoutes, { prefix: '/events' });
app.register(resultsRoutes, { prefix: '/results' });
app.register(profileRoutes, { prefix: '/profile' });

app.get('/health', async () => ({ status: 'ok', ts: new Date() }));

initScheduler();
await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
```

---

## 4. Moduł scrapowania danych

### 4.1 Strategia scrapowania

| Źródło | URL | Format | Częstotliwość | Metoda |
|---|---|---|---|---|
| IPSC Polska | ipsc-pl.org/zawody/kalendarz | HTML (Joomla) | Co 6 godzin | Cheerio |
| PZSS | pzss.org.pl/kalendarz | HTML tabela | Co 12 godzin | Cheerio |
| PractiScore wyniki | practiscore.com/results | HTML + JSON | Co 2 godziny | Cheerio + fetch |
| PractiScore kalendarz | practiscore.com/clubs/api/calendar | iframe/JSON | Co 6 godzin | API call |
| IPSC.org L3+ | ipsc.org/ipsc-matches/ | HTML (WordPress) | Co 24 godziny | Cheerio |

### 4.2 Scraper IPSC Polska

```typescript
// src/services/scrapers/ipsc_pl.ts
import * as cheerio from 'cheerio';
import { prisma } from '../lib/prisma';

const BASE_URL = 'https://ipsc-pl.org/zawody/kalendarz';

export async function scrapeIpscPl(): Promise<void> {
  const res = await fetch(BASE_URL, {
    headers: { 'User-Agent': process.env.SCRAPER_USER_AGENT! }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const events: EventInput[] = [];

  // Tabela kalendarza na ipsc-pl.org
  $('table tr').each((i, row) => {
    if (i === 0) return; // pomiń nagłówek
    const cols = $(row).find('td');
    if (cols.length < 4) return;

    const dateStr   = $(cols[0]).text().trim();
    const name      = $(cols[1]).text().trim();
    const location  = $(cols[2]).text().trim();
    const levelStr  = $(cols[3]).text().trim();
    const psUrl     = $(cols[1]).find('a').attr('href') ?? null;

    const parsed    = parseDateRange(dateStr);  // { start: Date, end: Date }
    const level     = parseLevelFromText(levelStr); // "L.II" → 2

    if (!name || !parsed) return;

    events.push({
      source: 'ipsc_pl',
      externalId: psUrl ?? `ipsc_pl_${name}_${dateStr}`,
      name,
      location,
      level,
      discipline: guessDiscipline(name), // "strzelba" → "shotgun", etc.
      startDate: parsed.start,
      endDate: parsed.end,
      registrationUrl: psUrl,
      status: parsed.start > new Date() ? 'upcoming' : 'finished',
    });
  });

  // Upsert — nie duplikuj, aktualizuj istniejące
  for (const ev of events) {
    await prisma.event.upsert({
      where: { externalId_source: { externalId: ev.externalId!, source: ev.source } },
      create: ev,
      update: { status: ev.status, currentShooters: ev.currentShooters, updatedAt: new Date() }
    });

    // Throttle — nie hammruj serwera
    await sleep(Number(process.env.SCRAPER_DELAY_MS ?? 1000));
  }

  await prisma.scraperLog.create({
    data: { source: 'ipsc_pl', status: 'success', itemsFound: events.length }
  });
}

// Pomocnicza funkcja do rozpoznawania dyscypliny z nazwy zawodów
function guessDiscipline(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('strzelb') || n.includes('shotgun')) return 'shotgun';
  if (n.includes('pcc') || n.includes('carbine'))     return 'pcc';
  if (n.includes('rifle') || n.includes('karabin'))   return 'rifle';
  if (n.includes('air') || n.includes('action air'))  return 'air';
  return 'pistol'; // default
}
```

### 4.3 Scraper PractiScore — wyniki

PractiScore nie ma publicznego JSON API dla wyników. Opcje (od najlepszej):

**Opcja A (rekomendowana):** Skontaktuj się z support@practiscore.com o oficjalny dostęp partnerski.

**Opcja B:** Wyniki jako HTML pod adresem `https://practiscore.com/results/web/[UUID]`. UUID pochodzi z kalendarza. Parsowanie tabelą Cheerio.

**Opcja C:** Umożliw organizatorom ręczny upload pliku `.psc` (eksport z aplikacji PractiScore) lub CSV.

```typescript
// src/services/scrapers/practiscore.ts
import * as cheerio from 'cheerio';
import { prisma } from '../lib/prisma';

// Pobierz UUID meczów z kalendarza PractiScore (Poland)
async function fetchMatchUuids(): Promise<string[]> {
  const res = await fetch(
    'https://practiscore.com/results/search?q=poland&type=match',
    { headers: { 'User-Agent': process.env.SCRAPER_USER_AGENT! } }
  );
  const html = await res.text();
  const $ = cheerio.load(html);
  const uuids: string[] = [];

  $('a[href*="/results/web/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/\/results\/web\/([a-f0-9-]{36})/);
    if (match) uuids.push(match[1]);
  });

  return [...new Set(uuids)]; // deduplikacja
}

export async function scrapePractiScore(): Promise<void> {
  const uuids = await fetchMatchUuids();

  for (const uuid of uuids.slice(0, 20)) { // limit per run
    try {
      await scrapeMatchResults(uuid);
      await sleep(2000);
    } catch (err) {
      await prisma.scraperLog.create({
        data: { source: 'practiscore', status: 'error', message: String(err) }
      });
    }
  }
}

async function scrapeMatchResults(uuid: string): Promise<void> {
  const res = await fetch(`https://practiscore.com/results/web/${uuid}`, {
    headers: { 'User-Agent': process.env.SCRAPER_USER_AGENT! }
  });

  if (!res.ok) return;
  const html = await res.text();
  const $ = cheerio.load(html);

  // Znajdź event w bazie lub pomiń
  const event = await prisma.event.findFirst({
    where: { externalId: uuid }
  });
  if (!event) return;

  // Parsuj tabelę wyników
  $('table.results-table tr').each(async (i, row) => {
    if (i === 0) return;
    const cols = $(row).find('td');
    if (cols.length < 5) return;

    const shooterName = $(cols[1]).text().trim();
    const division    = $(cols[2]).text().trim();
    const percentage  = parseFloat($(cols[3]).text()) || null;
    const rank        = parseInt($(cols[0]).text()) || null;

    if (!shooterName) return;

    await prisma.result.upsert({
      where: { eventId_shooterName_division: {
        eventId: event.id, shooterName, division
      }},
      create: { eventId: event.id, shooterName, division, percentage, rank },
      update: { percentage, rank }
    });
  });
}
```

### 4.4 Scheduler

```typescript
// src/services/scheduler.ts
import cron from 'node-cron';
import { scrapeIpscPl } from './scrapers/ipsc_pl';
import { scrapePzss } from './scrapers/pzss';
import { scrapePractiScore } from './scrapers/practiscore';
import { matchResultsToUsers } from './matcher';
import { sendRegistrationNotifications } from './notifier';

export function initScheduler() {
  // Co 6 godzin — kalendarz IPSC PL
  cron.schedule('0 */6 * * *', async () => {
    console.log('[scheduler] scraping ipsc_pl...');
    await scrapeIpscPl().catch(console.error);
    await sendRegistrationNotifications().catch(console.error);
  });

  // Co 12 godzin — kalendarz PZSS
  cron.schedule('0 */12 * * *', () => scrapePzss().catch(console.error));

  // Co 2 godziny — nowe wyniki PractiScore
  cron.schedule('0 */2 * * *', async () => {
    await scrapePractiScore().catch(console.error);
    await matchResultsToUsers().catch(console.error);
  });

  console.log('[scheduler] initialized');
}
```

### 4.5 Matcher — dopasowanie wyników do użytkowników

```typescript
// src/services/matcher.ts
import { prisma } from '../lib/prisma';

export async function matchResultsToUsers(): Promise<void> {
  // Pobierz wszystkich userów którzy mają ustawiony alias
  const users = await prisma.user.findMany({
    where: { shooterAlias: { not: null } }
  });

  for (const user of users) {
    // Szukaj wyników pasujących do aliasu (case-insensitive)
    const results = await prisma.result.findMany({
      where: {
        userId: null, // jeszcze nie przypisane
        shooterName: {
          contains: user.shooterAlias!,
          mode: 'insensitive'
        }
      }
    });

    if (results.length === 0) continue;

    // Przypisz wyniki do usera
    await prisma.result.updateMany({
      where: { id: { in: results.map(r => r.id) } },
      data: { userId: user.id }
    });
  }
}
```

---

## 5. Aplikacja mobilna — React Native

### 5.1 Struktura katalogów

```
mobile/
├── app/                        # Expo Router (file-based routing)
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tab bar konfiguracja
│   │   ├── index.tsx           # Home — nadchodzące zawody
│   │   ├── calendar.tsx        # Pełny kalendarz z filtrami
│   │   ├── results.tsx         # Wyszukiwarka wyników
│   │   └── profile.tsx         # Profil + historia startów
│   ├── event/
│   │   └── [id].tsx            # Szczegóły zawodów
│   ├── auth/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── _layout.tsx             # Root layout, nawigacja, auth guard
├── components/
│   ├── EventCard.tsx           # Karta zawodów na liście
│   ├── ResultRow.tsx           # Wiersz wyników zawodnika
│   ├── FilterSheet.tsx         # Bottom sheet z filtrami
│   ├── ProgressChart.tsx       # Wykres % score przez sezon (Victory Native)
│   ├── EmptyState.tsx          # Placeholder gdy brak danych
│   └── ui/                     # Primitive: Button, Input, Badge, Skeleton
├── stores/
│   ├── authStore.ts            # Zustand — user, token, logout
│   └── filterStore.ts          # Zustand — aktywne filtry kalendarza
├── hooks/
│   ├── useEvents.ts            # React Query — lista zawodów
│   ├── useEvent.ts             # React Query — pojedynczy event
│   ├── useResults.ts           # React Query — wyniki
│   └── useProfile.ts           # React Query — profil + historia
├── lib/
│   ├── api.ts                  # Axios instance + interceptory JWT
│   └── storage.ts              # expo-secure-store helpers
├── constants/
│   └── disciplines.ts          # Mapowanie dyscyplin PL↔EN, ikony
└── app.config.ts               # Expo config z env variables
```

### 5.2 Ekrany aplikacji

| Ekran | Kluczowe elementy |
|---|---|
| **Home** | Poziome filtry (wszystkie/pistolet/strzelba/PCC), FlatList kart zawodów, pull-to-refresh, badge "Zapisy otwarte" |
| **Calendar** | FlatList z sekcjami miesięcznymi, FAB otwierający FilterSheet, wyszukiwarka po nazwie, chip aktywnych filtrów |
| **Event Detail** | MapView (lat/lng), status zapisów z countdown, przycisk "Zapisz się" → otwiera URL rejestracji, lista wyników po zakończeniu |
| **Results Search** | Input z debounce 500ms, wyniki pogrupowane po zawodach, tap → Event Detail z podświetleniem zawodnika |
| **Profile** | Numery licencji (IPSC/PZSS), alias, ProgressChart % przez sezon, tabela ostatnich startów, przycisk Upgrade do Pro |
| **Login / Register** | Email + hasło, walidacja Zod, obsługa błędów API, link "Zapomniałem hasła" |

### 5.3 Kluczowe fragmenty kodu

**lib/api.ts — Axios z auto-refresh tokena:**

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

// Dołącz access token do każdego requestu
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Automatyczny refresh gdy 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status !== 401) return Promise.reject(error);

    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    const { data } = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`, {
      refreshToken
    });
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    error.config.headers.Authorization = `Bearer ${data.accessToken}`;
    return api(error.config);
  }
);
```

**hooks/useEvents.ts:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface EventFilters {
  discipline?: string;
  level?: number;
  region?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => api.get('/events', { params: filters }).then(r => r.data),
    staleTime: 1000 * 60 * 15,  // 15 minut — odświeżaj rzadko
    gcTime:    1000 * 60 * 60,  // 1 godzina w pamięci
  });
}
```

**stores/authStore.ts:**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

interface User { id: string; name: string; email: string; tier: string; }

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoggedIn: false,
  setAuth: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ user, isLoggedIn: true });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isLoggedIn: false });
  }
}));
```

**components/EventCard.tsx:**

```tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const DISCIPLINE_LABELS: Record<string, string> = {
  pistol: '🔫 Pistolet',
  shotgun: '💥 Strzelba',
  pcc: '🔧 PCC',
  rifle: '🎯 Karabinek',
  air: '💨 Action Air',
};

export function EventCard({ event }: { event: Event }) {
  const router = useRouter();
  const dateStr = new Date(event.startDate).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const isOpen = event.status === 'upcoming' &&
    event.registrationOpen && new Date(event.registrationOpen) < new Date() &&
    event.registrationClose && new Date(event.registrationClose) > new Date();

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/event/${event.id}`)}>
      <View style={styles.header}>
        <Text style={styles.discipline}>{DISCIPLINE_LABELS[event.discipline] ?? event.discipline}</Text>
        <Text style={styles.level}>L{event.level}</Text>
        {isOpen && <Text style={styles.openBadge}>Zapisy otwarte</Text>}
      </View>
      <Text style={styles.name}>{event.name}</Text>
      <Text style={styles.meta}>{dateStr} · {event.location}</Text>
      {event.currentShooters != null && event.maxShooters != null && (
        <Text style={styles.shooters}>{event.currentShooters}/{event.maxShooters} zawodników</Text>
      )}
    </Pressable>
  );
}
```

**stores/filterStore.ts:**

```typescript
import { create } from 'zustand';

interface FilterState {
  discipline: string | null;
  level: number | null;
  region: string | null;
  status: string;
  setDiscipline: (d: string | null) => void;
  setLevel: (l: number | null) => void;
  setRegion: (r: string | null) => void;
  setStatus: (s: string) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>()((set) => ({
  discipline: null,
  level: null,
  region: null,
  status: 'upcoming',
  setDiscipline: (discipline) => set({ discipline }),
  setLevel: (level) => set({ level }),
  setRegion: (region) => set({ region }),
  setStatus: (status) => set({ status }),
  reset: () => set({ discipline: null, level: null, region: null, status: 'upcoming' }),
}));
```

---

## 6. Push Notifications

### 6.1 Trzy scenariusze powiadomień

| Scenariusz | Kiedy | Treść |
|---|---|---|
| Otwarcie zapisów | Gdy `registrationOpen` mija | "Otwarto zapisy: [nazwa] — [data] · [miasto]" |
| Reminder przed zawodami | 7 dni i 24h przed startem (dla zapisanych) | "Za 7 dni startujesz w [nazwa]!" |
| Nowe wyniki | Gdy scrapowane wyniki zawierają nazwisko usera | "Twoje wyniki z [nazwa] są dostępne — X. miejsce, XX%" |

### 6.2 Implementacja

```typescript
// mobile/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID
  })).data;

  await api.post('/profile/push-token', { token });
  return token;
}
```

```typescript
// backend/src/services/notifier.ts
import { Expo } from 'expo-server-sdk';
import { prisma } from '../lib/prisma';

const expo = new Expo();

export async function sendNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!Expo.isExpoPushToken(pushToken)) return;

  await expo.sendPushNotificationsAsync([{
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  }]);
}

export async function sendRegistrationNotifications() {
  // Znajdź zawody które właśnie otworzyły zapisy (w ostatnich 2h)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const events = await prisma.event.findMany({
    where: {
      registrationOpen: { gte: twoHoursAgo, lte: new Date() },
      status: 'upcoming'
    }
  });

  // Pobierz userów Pro z push tokenem którzy chcą powiadomień
  const users = await prisma.user.findMany({
    where: { pushToken: { not: null }, tier: 'pro', notifySignup: true }
  });

  for (const event of events) {
    for (const user of users) {
      if (!user.region || user.region === event.voivodeship || event.level >= 3) {
        await sendNotification(
          user.pushToken!,
          'Otwarto zapisy!',
          `${event.name} · ${new Date(event.startDate).toLocaleDateString('pl-PL')} · ${event.city}`,
          { eventId: event.id }
        );
      }
    }
  }
}
```

---

## 7. Monetyzacja — implementacja

### 7.1 Model Freemium

| Funkcja | Free | Pro (49 zł/rok) |
|---|---|---|
| Kalendarz zawodów | ✅ pełny | ✅ pełny |
| Przeglądanie wyników | ✅ pełne | ✅ pełne |
| Powiadomienia o nowych zawodach | ❌ | ✅ |
| Historia startów | ostatnie 3 | ✅ nieograniczona |
| Wykres progresu przez sezon | ❌ | ✅ |
| Eksport PDF wyników | ❌ | ✅ |
| Brak reklam | ❌ | ✅ |
| Powiadomienia o wynikach | ❌ | ✅ |

### 7.2 Integracja RevenueCat

```typescript
// mobile/lib/purchases.ts
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

export function initPurchases() {
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({
    apiKey: Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_RC_IOS_KEY!
      : process.env.EXPO_PUBLIC_RC_ANDROID_KEY!
  });
}

export async function checkProStatus(): Promise<boolean> {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active['pro'] !== undefined;
}

export async function purchasePro(): Promise<boolean> {
  const offerings = await Purchases.getOfferings();
  const proPackage = offerings.current?.annual;
  if (!proPackage) return false;

  const { customerInfo } = await Purchases.purchasePackage(proPackage);
  return customerInfo.entitlements.active['pro'] !== undefined;
}
```

```tsx
// Użycie w komponencie — blokowanie Pro features
function ProfileHistorySection() {
  const { data: profile } = useProfile();
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    checkProStatus().then(setIsPro);
  }, []);

  if (!isPro) {
    return (
      <View>
        <Text>Historia startów dostępna w planie Pro</Text>
        <Button onPress={purchasePro} title="Upgrade do Pro — 49 zł/rok" />
      </View>
    );
  }

  return <HistoryChart data={profile?.history} />;
}
```

---

## 8. Zmienne środowiskowe

### 8.1 Backend — `.env.example`

```env
# Baza danych
DATABASE_URL=postgresql://user:password@host:5432/shootlog
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=minimum-32-characters-random-string
JWT_REFRESH_SECRET=another-32-characters-random-string
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Serwer
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:8081,https://shootlog.pl

# Email (reset hasła — Mailgun lub Resend)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.shootlog.pl
SMTP_PASS=your-mailgun-api-key
EMAIL_FROM=noreply@shootlog.pl

# Scraper
SCRAPER_USER_AGENT=ShootLogBot/1.0 (kontakt@shootlog.pl)
SCRAPER_DELAY_MS=2000
```

### 8.2 Mobile — `app.config.ts`

```typescript
export default {
  expo: {
    name: 'ShootLog',
    slug: 'shootlog',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'shootlog',
    extra: {
      eas: { projectId: process.env.EXPO_PROJECT_ID }
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      ['expo-notifications', { icon: './assets/notification-icon.png' }]
    ]
  }
};
```

Zmienne w pliku `.env.local` dla Expo (prefix `EXPO_PUBLIC_` = dostępne w apce):

```env
EXPO_PUBLIC_API_URL=https://api.shootlog.pl
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
EXPO_PUBLIC_RC_IOS_KEY=appl_xxxx
EXPO_PUBLIC_RC_ANDROID_KEY=goog_xxxx
```

---

## 9. Plan implementacji MVP

### 9.1 Fazy (16 tygodni)

| Faza | Czas | Co budujemy | Cel weryfikacji |
|---|---|---|---|
| 1 — Fundament | Tydzień 1–2 | Repo, Prisma schema, seed data, GET /events | API odpowiada, dane w bazie |
| 2 — Scrapery | Tydzień 3–4 | Scraper ipsc-pl.org + pzss.org.pl + scheduler | Kalendarz zapełniony danymi live |
| 3 — Mobile core | Tydzień 5–7 | Expo init, Home + Calendar + EventDetail, integracja API | Można przeglądać zawody na telefonie |
| 4 — Auth + profil | Tydzień 8–9 | Rejestracja/logowanie, profil, zapisane zawody | User loguje się i zapisuje event |
| 5 — Wyniki | Tydzień 10–11 | Scraper wyników PS, Results Search, matcher | Można znaleźć swoje wyniki |
| 6 — Powiadomienia | Tydzień 12 | Push notifications, 3 scenariusze | User dostaje powiadomienie |
| 7 — Monetyzacja | Tydzień 13–14 | RevenueCat, blokowanie Pro features | Można kupić Pro |
| 8 — Launch | Tydzień 15–16 | Sentry, testy, submit App Store + Google Play | Apka w sklepach |

### 9.2 Kolejność plików do stworzenia

Implementuj w tej kolejności:

1. `backend/package.json` + `tsconfig.json` — init projektu TypeScript
2. `backend/prisma/schema.prisma` — schemat bazy z sekcji 2
3. `backend/src/lib/prisma.ts` — singleton klienta Prisma
4. `backend/src/lib/redis.ts` — singleton klienta Redis
5. `backend/src/index.ts` — inicjalizacja Fastify z sekcji 3.4
6. `backend/src/routes/events.ts` — GET /events z filtrowaniem i paginacją
7. `backend/src/services/scrapers/ipsc_pl.ts` — scraper z sekcji 4.2
8. `backend/src/services/scrapers/pzss.ts` — analogiczny do ipsc_pl
9. `backend/src/services/scheduler.ts` — cron z sekcji 4.4
10. `mobile/` — `npx create-expo-app mobile --template blank-typescript`
11. `mobile/lib/api.ts` — Axios instance z sekcji 5.3
12. `mobile/stores/authStore.ts` — Zustand auth store
13. `mobile/stores/filterStore.ts` — Zustand filter store
14. `mobile/app/(tabs)/index.tsx` — ekran Home z FlatList
15. `mobile/app/(tabs)/calendar.tsx` — kalendarz z filtrami
16. `mobile/components/EventCard.tsx` — karta zawodów
17. `mobile/components/FilterSheet.tsx` — bottom sheet filtry
18. `backend/src/routes/auth.ts` — register + login + refresh
19. `mobile/app/auth/login.tsx` + `register.tsx`
20. `backend/src/services/scrapers/practiscore.ts` — wyniki
21. `mobile/app/(tabs)/results.tsx` — wyszukiwarka wyników
22. `mobile/app/(tabs)/profile.tsx` — profil + historia
23. `backend/src/services/notifier.ts` — push notifications
24. `mobile/lib/notifications.ts` — rejestracja tokenów

---

## 10. Wdrożenie i infrastruktura

### 10.1 Hosting — darmowy start

| Serwis | Co hostuje | Koszt | Limity darmowego planu |
|---|---|---|---|
| Railway.app | Backend Node.js | $0 ($5 kredyt/mies.) | 500h compute, 1GB RAM |
| Supabase | PostgreSQL | $0 | 500MB DB, 2GB bandwidth |
| Upstash | Redis | $0 | 10 000 req/dzień |
| GitHub Actions | CI/CD | $0 | 2000 min/mies. |
| Sentry | Error tracking | $0 | 5000 błędów/mies. |
| Expo EAS | Build + submit | $0 | 30 buildów/mies. |

### 10.2 GitHub Actions — CI/CD

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Run Prisma migrations
        run: cd backend && npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy to Railway
        uses: railwayapp/cli-action@v1
        with:
          service: shootlog-api
          token: ${{ secrets.RAILWAY_TOKEN }}
```

```yaml
# .github/workflows/deploy-mobile.yml
name: Build Mobile (EAS)

on:
  push:
    branches: [main]
    paths: ['mobile/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd mobile && npm ci
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd mobile && eas build --platform all --non-interactive
```

### 10.3 Monitoring

```typescript
// backend/src/plugins/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

```typescript
// mobile — błędy w apce
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});
```

---

## 11. Ryzyka i mitygacja

| Ryzyko | Prawdopodobieństwo | Mitygacja |
|---|---|---|
| PractiScore blokuje scraping | Wysokie | Kontakt z support@practiscore.com o oficjalny dostęp. Fallback: upload CSV przez organizatorów |
| Strony ipsc-pl.org / pzss.org.pl zmieniają strukturę HTML | Średnie | ScraperLog monitoring, alert gdy 0 wyników przez 24h, modułowa architektura scraperów |
| Mała baza użytkowników w Polsce | Średnie | Buduj od razu po angielsku, target CEE (CZ, SK, HU, LT) |
| RODO — dane osobowe zawodników | Niskie | Wyniki zawodów są publiczne. Polityka prywatności, możliwość usunięcia konta |
| App Store odrzuca apkę | Niskie | Kategoria Sports, bez kontrowersyjnych treści, postępuj zgodnie z guidelines |

---

## 12. Słownik pojęć

| Termin | Definicja |
|---|---|
| IPSC | International Practical Shooting Confederation — organizacja strzelectwa dynamicznego |
| PZSS | Polski Związek Strzelectwa Sportowego — krajowy związek sportowy |
| Level (L1–L5) | Ranga zawodów: L1=klub, L2=regionalny, L3=krajowy/duży, L4=kontynentalny, L5=światowy |
| Division | Klasa sprzętowa (Pistolet Open/Standard/Production, Strzelba, PCC, Mini Rifle, Action Air) |
| % score | Procent maksymalnego wyniku — kluczowa metryka porównawcza w IPSC |
| Puchar Polski | Roczny ranking sumujący wyniki z najlepszych zawodów L3 |
| PractiScore | Dominująca platforma do obsługi i publikacji wyników zawodów IPSC globalnie |
| Squad | Grupa zawodników strzelająca razem przez cały mecz |
| MD / Match Director | Dyrektor zawodów — główny organizator |
| Hit Factor | Punkty podzielone przez czas strzelania — podstawowa metryka IPSC |

---

> **Jak zacząć:** Przekaż ten plik Claude Code i powiedz: *"Zaimplementuj fazę 1 — utwórz strukturę repo z plikami wymienionymi w punktach 1–6 sekcji 9.2"*. Następnie przechodzisz przez kolejne fazy po kolei.
