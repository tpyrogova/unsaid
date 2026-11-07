/**
 * Crisis contacts shown by the safety protocol. They come from this file,
 * never from the model (a model can invent a phone number).
 *
 * Every entry must be checked against its official source before release.
 * Last checked: 2026-11-06.
 */
export interface Localized {
  ru: string
  en: string
}

export interface CrisisContact {
  name: Localized
  /** Display form; `tel` is the dialable form. Omit both for chat-only services. */
  phone?: string
  tel?: string
  url?: string
  note: Localized
  source: string
}

export interface CountryContacts {
  country: Localized
  contacts: CrisisContact[]
}

const EMERGENCY: Omit<CrisisContact, 'source'> = {
  name: { ru: 'Экстренная помощь', en: 'Emergency services' },
  phone: '112',
  tel: '112',
  note: { ru: 'Если есть непосредственная опасность для жизни.', en: 'If there is an immediate danger to life.' },
}

export const CRISIS_CONTACTS: CountryContacts[] = [
  {
    country: { ru: 'Германия', en: 'Germany' },
    contacts: [
      {
        name: { ru: 'TelefonSeelsorge', en: 'TelefonSeelsorge' },
        phone: '0800 111 0 111',
        tel: '08001110111',
        note: {
          ru: 'Бесплатно, анонимно, круглосуточно. Также 0800 111 0 222 и 116 123. Консультации на немецком.',
          en: 'Free, anonymous, 24/7. Also 0800 111 0 222 and 116 123. Counselling in German.',
        },
        url: 'https://www.telefonseelsorge.de/chat/',
        source: 'https://www.telefonseelsorge.de/',
      },
      { ...EMERGENCY, source: 'https://www.112.eu/' },
    ],
  },
  {
    country: { ru: 'Украина', en: 'Ukraine' },
    contacts: [
      { ...EMERGENCY, source: 'https://www.findahelpline.com/countries/ua' },
      {
        name: { ru: 'krisenchat (украинский и русский)', en: 'krisenchat (Ukrainian and Russian)' },
        url: 'https://krisenchat.de/en/ukraine',
        note: { ru: 'Кризисный чат для молодых людей.', en: 'Crisis chat for young people.' },
        source: 'https://www.findahelpline.com/countries/ua',
      },
      // Lifeline Ukraine (7333) is NOT listed: as of 2026-11-06 its site says
      // «Робота гарячої лінії на паузі». Re-check https://lifelineukraine.com/.
    ],
  },
]

/** Plain-text form for the model prompt's {crisis_contacts} placeholder (prompt is in Russian). */
export function crisisContactsText(): string {
  return CRISIS_CONTACTS.map(
    ({ country, contacts }) =>
      `${country.ru}: ${contacts.map((c) => [c.name.ru, c.phone, c.url].filter(Boolean).join(' ')).join('; ')}`,
  ).join('. ')
}
