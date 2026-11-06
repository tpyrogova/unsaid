/**
 * Crisis contacts shown by the safety protocol. They come from this file,
 * never from the model (a model can invent a phone number).
 *
 * Every entry must be checked against its official source before release.
 * Last checked: 2026-11-06.
 */
export interface CrisisContact {
  name: string
  /** Display form; `tel` is the dialable form. Omit both for chat-only services. */
  phone?: string
  tel?: string
  url?: string
  note: string
  source: string
}

export interface CountryContacts {
  country: string
  contacts: CrisisContact[]
}

export const CRISIS_CONTACTS: CountryContacts[] = [
  {
    country: 'Германия',
    contacts: [
      {
        name: 'TelefonSeelsorge',
        phone: '0800 111 0 111',
        tel: '08001110111',
        note: 'Бесплатно, анонимно, круглосуточно. Также 0800 111 0 222 и 116 123. Консультации на немецком.',
        url: 'https://www.telefonseelsorge.de/chat/',
        source: 'https://www.telefonseelsorge.de/',
      },
      {
        name: 'Экстренная помощь',
        phone: '112',
        tel: '112',
        note: 'Если есть непосредственная опасность для жизни.',
        source: 'https://www.112.eu/',
      },
    ],
  },
  {
    country: 'Украина',
    contacts: [
      {
        name: 'Экстренная помощь',
        phone: '112',
        tel: '112',
        note: 'Если есть непосредственная опасность для жизни.',
        source: 'https://www.findahelpline.com/countries/ua',
      },
      {
        name: 'krisenchat (украинский и русский)',
        url: 'https://krisenchat.de/en/ukraine',
        note: 'Кризисный чат для молодых людей.',
        source: 'https://www.findahelpline.com/countries/ua',
      },
      // Lifeline Ukraine (7333) is NOT listed: as of 2026-11-06 its site says
      // «Робота гарячої лінії на паузі». Re-check https://lifelineukraine.com/.
    ],
  },
]

/** Plain-text form for the model prompt's {crisis_contacts} placeholder. */
export function crisisContactsText(): string {
  return CRISIS_CONTACTS.map(
    ({ country, contacts }) =>
      `${country}: ${contacts.map((c) => [c.name, c.phone, c.url].filter(Boolean).join(' ')).join('; ')}`,
  ).join('. ')
}
