/**
 * API error messages in both UI languages. Handlers throw `HttpError` with a
 * key; the middleware picks the language from the request's Accept-Language.
 */
export const MESSAGES = {
  authRequired: { ru: 'Нужно войти в аккаунт', en: 'Please log in' },
  wrongCredentials: { ru: 'Неверный email или пароль', en: 'Wrong email or password' },
  wrongPassword: { ru: 'Неверный пароль', en: 'Wrong password' },
  emailTaken: { ru: 'Аккаунт с таким email уже существует', en: 'An account with this email already exists' },
  tooManyAttempts: {
    ru: 'Слишком много попыток. Попробуйте через 15 минут.',
    en: 'Too many attempts. Please try again in 15 minutes.',
  },
  expectedJson: { ru: 'Ожидается JSON', en: 'JSON expected' },
  bodyTooLarge: { ru: 'Слишком большой запрос', en: 'Request is too large' },
  invalidJson: { ru: 'Некорректный JSON', en: 'Invalid JSON' },
  invalidRequest: { ru: 'Некорректные данные запроса', en: 'Invalid request data' },
  invalidEntryId: { ru: 'Некорректный id записи', en: 'Invalid entry id' },
  serverMisconfigured: { ru: 'Сервер не настроен: нет SALT_SECRET', en: 'Server is not configured: SALT_SECRET is missing' },
  internal: { ru: 'Что-то пошло не так на сервере', en: 'Something went wrong on the server' },
  modelQuota: {
    ru: 'Бесплатный дневной лимит модели исчерпан. Он обновится в 00:00 UTC (01:00 по Берлину).',
    en: 'The free daily model quota is used up. It resets at 00:00 UTC.',
  },
  modelUnavailable: {
    ru: 'Модель сейчас недоступна. Попробуйте чуть позже.',
    en: 'The model is unavailable right now. Please try again a bit later.',
  },
  modelBadOutput: {
    ru: 'Модель вернула ответ в неожиданном формате. Попробуйте ещё раз.',
    en: 'The model returned an unexpected format. Please try again.',
  },
  budgetAnalyze: {
    ru: 'Лимит 20 разборов в сутки исчерпан. Возвращайтесь завтра.',
    en: 'The limit of 20 reviews per day is reached. Please come back tomorrow.',
  },
  budgetPeriod: {
    ru: 'Лимит 5 анализов за период в сутки исчерпан. Возвращайтесь завтра.',
    en: 'The limit of 5 period reviews per day is reached. Please come back tomorrow.',
  },
  budgetCategorize: {
    ru: 'Лимит категоризации (400 записей в сутки) исчерпан. Продолжите завтра.',
    en: 'The categorization limit (400 entries per day) is reached. Please continue tomorrow.',
  },
} as const

export type MessageKey = keyof typeof MESSAGES
export type ApiLang = 'ru' | 'en'

/** Russian for ru/uk/be (and when unspecified), English otherwise. */
export function requestLang(request: Request): ApiLang {
  const header = request.headers.get('Accept-Language')
  if (!header) return 'ru'
  return /^(ru|uk|be)\b/i.test(header.trim()) ? 'ru' : 'en'
}

export function message(key: MessageKey, lang: ApiLang): string {
  return MESSAGES[key][lang]
}
