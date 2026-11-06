import { describe, expect, it } from 'vitest'
import { buildReviewSystemPrompt, markdownSection, systemPromptTemplate } from '../server/carefulPrompt'
import { CAREFUL_REVIEW_MD } from '../server/generated/careful-review'

describe('prompts/careful-review.md', () => {
  it('has a system prompt block with the expected placeholders', () => {
    const template = systemPromptTemplate()
    expect(template).toContain('{framework}')
    expect(template).toContain('{crisis_contacts}')
  })

  it('cuts a section up to the next heading', () => {
    const safety = markdownSection(CAREFUL_REVIEW_MD, 'Протокол безопасности')
    expect(safety).toContain('Уровень')
    expect(safety).not.toContain('## Рубрика оценки')
  })

  it('fails loudly if the markdown loses the system prompt block', () => {
    expect(() => systemPromptTemplate('# пусто')).toThrow(/Системный промпт/)
  })

  it('auto framework lets the model pick exactly one and explain it', () => {
    const prompt = buildReviewSystemPrompt({ framework: 'auto', scope: 'entry', caution: false })
    expect(prompt).toContain('выбери сам ОДНУ')
    expect(prompt).not.toContain('РАЗБОР ЗА ПЕРИОД')
  })
})
