/**
 * Builds prompts from prompts/careful-review.md (bundled by Vite via `?raw`).
 * The markdown is the single editable source: the system prompt, the
 * "forbidden → allowed" language table and the safety protocol all come from it.
 */
import { crisisContactsText } from '../config/crisis-contacts'
import { FRAMEWORKS, type FrameworkChoice } from '../shared/analysis'
import CAREFUL_REVIEW_MD from '../prompts/careful-review.md?raw'

/** Text of a `## Heading` section, up to the next `## `. */
export function markdownSection(markdown: string, heading: string): string {
  const start = markdown.indexOf(`## ${heading}`)
  if (start === -1) throw new Error(`careful-review.md: нет раздела «${heading}»`)
  const rest = markdown.slice(start)
  const next = rest.indexOf('\n## ', 3)
  return (next === -1 ? rest : rest.slice(0, next)).trim()
}

/** The ```text block inside «Системный промпт». */
export function systemPromptTemplate(markdown: string = CAREFUL_REVIEW_MD): string {
  const section = markdownSection(markdown, 'Системный промпт')
  const match = section.match(/```text\n([\s\S]*?)```/)
  if (!match?.[1]) throw new Error('careful-review.md: в разделе «Системный промпт» нет блока ```text')
  return match[1].trim()
}

const AUTO_FRAMEWORK =
  'выбери сам ОДНУ наиболее подходящую рамку из трёх: КПТ, схема-терапия или привязанность, и одной строкой объясни выбор в поле rationale'

const APP_FORMAT = `ФОРМАТ ДЛЯ ПРИЛОЖЕНИЯ
Верни блоки строго JSON по схеме, а не markdown: heard = «Услышано», feelings = «Чувства и потребности» (quote — короткая дословная цитата, символ в символ), distortions = «Ловушки мышления», pattern = «Замеченный паттерн», question = «Вопрос себе», steps = «Маленькие шаги».

Отличия от формата выше:
- «Вопросы себе» — ровно ОДИН вопрос, самый точный.
- Дополнительный блок «Ловушки мышления» (distortions): 0–2 пункта, только если ловушка явно видна в тексте. type называет ловушку мысли («чтение мыслей», «катастрофизация», «обесценивание позитивного»…), а не ярлык человека. quote — дословная цитата, где она видна. reframe — бережная переформулировка той же мысли от первого лица, как вариант, а не исправление. Нет явной ловушки — пустой список.

Отвечай на языке записей; если они на смеси языков — по-русски.`

const CAUTION_MODE = `РЕЖИМ НАСТОРОЖЕННОСТИ
В записях есть признаки тяжёлого состояния. Сделай разбор короче и сфокусируйся на поддержке. Среди вопросов мягко спроси, есть ли рядом люди и поддержка. Среди шагов уместно предложить поговорить с близким человеком или специалистом.`

const PERIOD_MODE = `РАЗБОР ЗА ПЕРИОД
Тебе дан не одна запись, а несколько записей за период, каждая с датой. Смотри на период целиком: что повторяется из записи в запись и что меняется со временем. Дополнительный блок changes («Что меняется»): 2–4 предложения о динамике — заметен ли сдвиг (рост) или автор возвращается к одному и тому же (хождение по кругу); опирайся на даты. Остальные блоки — про период в целом, цитаты бери из любых записей.`

export interface PromptOptions {
  framework: FrameworkChoice
  scope: 'entry' | 'period'
  caution: boolean
  focus?: string
  markdown?: string
}

export function buildReviewSystemPrompt(options: PromptOptions): string {
  const markdown = options.markdown ?? CAREFUL_REVIEW_MD
  const framework = options.framework === 'auto' ? AUTO_FRAMEWORK : FRAMEWORKS[options.framework]

  const parts = [
    systemPromptTemplate(markdown).replaceAll('{framework}', framework).replaceAll('{crisis_contacts}', crisisContactsText()),
    // The language table doubles as guidance on wording.
    markdownSection(markdown, 'Язык: запреты и замены'),
    APP_FORMAT,
  ]
  if (options.scope === 'period') parts.push(PERIOD_MODE)
  if (options.caution) parts.push(CAUTION_MODE)
  if (options.focus) {
    // The focus is user data: quoted and explicitly not allowed to override the rules.
    parts.push(
      `ПОЖЕЛАНИЕ АВТОРА\nАвтор просит обратить особое внимание на: «${options.focus}». Учти это, но все принципы и правила безопасности выше важнее.`,
    )
  }
  return parts.join('\n\n')
}

/** Instructions for the separate risk check, taken from «Протокол безопасности». */
export function safetySystemPrompt(markdown: string = CAREFUL_REVIEW_MD): string {
  return `Ты — классификатор риска для дневниковых записей. Разбор не делаешь, только определяешь уровень риска по протоколу ниже.

${markdownSection(markdown, 'Протокол безопасности')}

Верни JSON: level (0, 1 или 2) и reason — одна короткая фраза без цитат.`
}
