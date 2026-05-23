import { Text, VStack, HStack, Spacer, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type WidgetEvent = {
  id: string;
  name: string;
  startDate: string;
  discipline: string;
  level: number;
  city?: string;
};

export type NearestEventsProps = {
  events: WidgetEvent[];
};

const NearestEventsWidget = (props: NearestEventsProps, env: WidgetEnvironment) => {
  'widget';

  const DISC_COLORS: Record<string, string> = {
    pistol:    '#2EA96B',
    shotgun:   '#C98B35',
    pcc:       '#3E8ED5',
    rifle:     '#D95F4B',
    air:       '#7B5ED0',
    longrange: '#8B7355',
  };

  const DISC_SHORTS: Record<string, string> = {
    pistol:    'PST',
    shotgun:   'STR',
    pcc:       'PCC',
    rifle:     'KAR',
    air:       'AAR',
    longrange: 'LR',
  };

  const MONTHS = ['STY','LUT','MAR','KWI','MAJ','CZE','LIP','SIE','WRZ','PAŹ','LIS','GRU'];

  function shortDate(iso: string): string {
    try {
      const d = new Date(iso);
      return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
    } catch {
      return iso.slice(5, 10);
    }
  }

  const BG     = '#0c0b0a';
  const TEXT   = '#f5efe6';
  const MUTE   = '#7a7169';
  const ACCENT = '#F97316';

  const events = props.events ?? [];
  const isSmall  = env.widgetFamily === 'systemSmall';
  const isLarge  = env.widgetFamily === 'systemLarge';
  const maxShown = isSmall ? 1 : isLarge ? 5 : 3;
  const shown = events.slice(0, maxShown);

  if (shown.length === 0) {
    return (
      <VStack spacing={4} modifiers={[containerBackground(BG, 'widget'), padding({ all: 14 }), widgetURL('shootlog:///profile')]}>
        <Text modifiers={[font({ weight: 'bold', size: 9 }), foregroundStyle(ACCENT)]}>
          SHOOTLOG
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTE)]}>
          Brak zapisanych
        </Text>
      </VStack>
    );
  }

  if (isSmall) {
    const ev = shown[0];
    const color = DISC_COLORS[ev.discipline] ?? ACCENT;
    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          containerBackground(BG, 'widget'),
          padding({ all: 14 }),
          widgetURL('shootlog:///profile'),
        ]}
      >
        <Text modifiers={[font({ weight: 'bold', size: 9 }), foregroundStyle(ACCENT)]}>
          SHOOTLOG
        </Text>
        <Spacer />
        <HStack spacing={6} modifiers={[padding({ bottom: 4 })]}>
          <Text modifiers={[font({ weight: 'bold', size: 9 }), foregroundStyle(color)]}>
            {DISC_SHORTS[ev.discipline] ?? 'PST'}
          </Text>
          <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTE)]}>
            {`L${ev.level}`}
          </Text>
        </HStack>
        <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle(TEXT)]}>
          {ev.name}
        </Text>
        <Spacer />
        <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle(color)]}>
          {shortDate(ev.startDate)}
        </Text>
        {ev.city ? (
          <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTE)]}>
            {ev.city}
          </Text>
        ) : null}
      </VStack>
    );
  }

  // systemLarge — 5 rows
  if (isLarge) {
    const e0 = shown[0];
    const e1 = shown[1] ?? null;
    const e2 = shown[2] ?? null;
    const e3 = shown[3] ?? null;
    const e4 = shown[4] ?? null;
    const lc0 = DISC_COLORS[e0.discipline] ?? ACCENT;
    const lc1 = e1 ? (DISC_COLORS[e1.discipline] ?? ACCENT) : ACCENT;
    const lc2 = e2 ? (DISC_COLORS[e2.discipline] ?? ACCENT) : ACCENT;
    const lc3 = e3 ? (DISC_COLORS[e3.discipline] ?? ACCENT) : ACCENT;
    const lc4 = e4 ? (DISC_COLORS[e4.discipline] ?? ACCENT) : ACCENT;
    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          containerBackground(BG, 'widget'),
          padding({ all: 14 }),
          widgetURL('shootlog:///profile'),
        ]}
      >
        <Text modifiers={[font({ weight: 'bold', size: 9 }), foregroundStyle(ACCENT), padding({ bottom: 10 })]}>
          ZAPISANE ZAWODY
        </Text>
        <HStack spacing={8} modifiers={[padding({ top: 0 })]}>
          <ZStack modifiers={[background(lc0), cornerRadius(2), frame({ width: 3, height: 36 })]} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(TEXT)]}>{e0.name}</Text>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTE)]}>{`L${e0.level}${e0.city ? ` · ${e0.city}` : ''}`}</Text>
          </VStack>
          <Spacer />
          <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle(lc0)]}>{shortDate(e0.startDate)}</Text>
        </HStack>
        {e1 ? (
          <HStack spacing={8} modifiers={[padding({ top: 10 })]}>
            <ZStack modifiers={[background(lc1), cornerRadius(2), frame({ width: 3, height: 36 })]} />
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(TEXT)]}>{e1.name}</Text>
              <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTE)]}>{`L${e1.level}${e1.city ? ` · ${e1.city}` : ''}`}</Text>
            </VStack>
            <Spacer />
            <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle(lc1)]}>{shortDate(e1.startDate)}</Text>
          </HStack>
        ) : null}
        {e2 ? (
          <HStack spacing={8} modifiers={[padding({ top: 10 })]}>
            <ZStack modifiers={[background(lc2), cornerRadius(2), frame({ width: 3, height: 36 })]} />
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(TEXT)]}>{e2.name}</Text>
              <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTE)]}>{`L${e2.level}${e2.city ? ` · ${e2.city}` : ''}`}</Text>
            </VStack>
            <Spacer />
            <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle(lc2)]}>{shortDate(e2.startDate)}</Text>
          </HStack>
        ) : null}
        {e3 ? (
          <HStack spacing={8} modifiers={[padding({ top: 10 })]}>
            <ZStack modifiers={[background(lc3), cornerRadius(2), frame({ width: 3, height: 36 })]} />
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(TEXT)]}>{e3.name}</Text>
              <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTE)]}>{`L${e3.level}${e3.city ? ` · ${e3.city}` : ''}`}</Text>
            </VStack>
            <Spacer />
            <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle(lc3)]}>{shortDate(e3.startDate)}</Text>
          </HStack>
        ) : null}
        {e4 ? (
          <HStack spacing={8} modifiers={[padding({ top: 10 })]}>
            <ZStack modifiers={[background(lc4), cornerRadius(2), frame({ width: 3, height: 36 })]} />
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(TEXT)]}>{e4.name}</Text>
              <Text modifiers={[font({ size: 10 }), foregroundStyle(MUTE)]}>{`L${e4.level}${e4.city ? ` · ${e4.city}` : ''}`}</Text>
            </VStack>
            <Spacer />
            <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle(lc4)]}>{shortDate(e4.startDate)}</Text>
          </HStack>
        ) : null}
      </VStack>
    );
  }

  // systemMedium — avoid .map() as JSC array children may not render;
  // render each row explicitly by index instead.
  const ev0 = shown[0];
  const ev1 = shown[1] ?? null;
  const ev2 = shown[2] ?? null;
  const c0 = DISC_COLORS[ev0.discipline] ?? ACCENT;
  const c1 = ev1 ? (DISC_COLORS[ev1.discipline] ?? ACCENT) : ACCENT;
  const c2 = ev2 ? (DISC_COLORS[ev2.discipline] ?? ACCENT) : ACCENT;
  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[
        containerBackground(BG, 'widget'),
        padding({ all: 14 }),
        widgetURL('shootlog:///profile'),
      ]}
    >
      <Text modifiers={[font({ weight: 'bold', size: 9 }), foregroundStyle(ACCENT), padding({ bottom: 8 })]}>
        ZAPISANE ZAWODY
      </Text>
      <HStack spacing={8} modifiers={[padding({ top: 0 })]}>
        <ZStack modifiers={[background(c0), cornerRadius(2), frame({ width: 3, height: 32 })]} />
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle(TEXT)]}>{ev0.name}</Text>
          <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTE)]}>{`L${ev0.level}${ev0.city ? ` · ${ev0.city}` : ''}`}</Text>
        </VStack>
        <Spacer />
        <Text modifiers={[font({ weight: 'semibold', size: 10 }), foregroundStyle(c0)]}>{shortDate(ev0.startDate)}</Text>
      </HStack>
      {ev1 ? (
        <HStack spacing={8} modifiers={[padding({ top: 7 })]}>
          <ZStack modifiers={[background(c1), cornerRadius(2), frame({ width: 3, height: 32 })]} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle(TEXT)]}>{ev1.name}</Text>
            <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTE)]}>{`L${ev1.level}${ev1.city ? ` · ${ev1.city}` : ''}`}</Text>
          </VStack>
          <Spacer />
          <Text modifiers={[font({ weight: 'semibold', size: 10 }), foregroundStyle(c1)]}>{shortDate(ev1.startDate)}</Text>
        </HStack>
      ) : null}
      {ev2 ? (
        <HStack spacing={8} modifiers={[padding({ top: 7 })]}>
          <ZStack modifiers={[background(c2), cornerRadius(2), frame({ width: 3, height: 32 })]} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle(TEXT)]}>{ev2.name}</Text>
            <Text modifiers={[font({ size: 9 }), foregroundStyle(MUTE)]}>{`L${ev2.level}${ev2.city ? ` · ${ev2.city}` : ''}`}</Text>
          </VStack>
          <Spacer />
          <Text modifiers={[font({ weight: 'semibold', size: 10 }), foregroundStyle(c2)]}>{shortDate(ev2.startDate)}</Text>
        </HStack>
      ) : null}
    </VStack>
  );
};

export default createWidget('NearestEventsWidget', NearestEventsWidget);
