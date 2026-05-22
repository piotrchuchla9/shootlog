import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../lib/prisma';
import { Event } from '@prisma/client';

const expo = new Expo();

function eventMatchesPrefs(
  event: Event,
  prefs: { disciplines: string[]; levels: number[]; voivodeships: string[]; cities: string[] }
): boolean {
  if (prefs.disciplines.length > 0 && !prefs.disciplines.includes(event.discipline)) return false;
  if (prefs.levels.length > 0 && !prefs.levels.includes(event.level)) return false;
  if (prefs.voivodeships.length > 0 && event.voivodeship && !prefs.voivodeships.includes(event.voivodeship)) return false;
  if (prefs.cities.length > 0 && event.city && !prefs.cities.includes(event.city)) return false;
  return true;
}

export async function sendNewEventNotifications(newEvents: Event[]) {
  if (newEvents.length === 0) return;

  const usersWithPrefs = await prisma.user.findMany({
    where: {
      pushToken: { not: null },
      notificationPreference: { enabled: true },
    },
    select: {
      pushToken: true,
      notificationPreference: {
        select: { disciplines: true, levels: true, voivodeships: true, cities: true },
      },
    },
  });

  const messages: ExpoPushMessage[] = [];

  for (const user of usersWithPrefs) {
    if (!user.pushToken || !Expo.isExpoPushToken(user.pushToken)) continue;
    const prefs = user.notificationPreference!;

    const matched = newEvents.filter((e) => eventMatchesPrefs(e, prefs));
    if (matched.length === 0) continue;

    const title = matched.length === 1 ? 'Nowe zawody!' : `${matched.length} nowych zawodów!`;
    const body =
      matched.length === 1
        ? `${matched[0].name} — ${matched[0].location}`
        : matched.map((e) => e.name).slice(0, 3).join(', ') + (matched.length > 3 ? '…' : '');

    messages.push({
      to: user.pushToken,
      title,
      body,
      data: { eventIds: matched.map((e) => e.id) },
      sound: 'default',
    });
  }

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error('[push] chunk send error:', err);
    }
  }

  console.log(`[push] sent ${messages.length} notifications for ${newEvents.length} new events`);
}
