/**
 * Synthetic journal entry used as the default input.
 * Fictional: written for demo purposes, contains no real personal data.
 */
export const SAMPLE_ENTRY = `Сегодня Аня снова написала первой, и я поймала себя на том, что одновременно обрадовалась и напряглась. Мне с ней тепло, но после каждой встречи я как будто выжата и прокручиваю в голове всё, что сказала не так. Вчера она ответила на моё сообщение через пять часов, и я весь вечер была уверена, что она на меня обиделась. Наверное, она просто терпит меня из вежливости. Я понимаю, что если начну говорить о том, что меня задевает, мы поссоримся и я останусь совсем одна. Так уже было с Леной: я долго молчала, а потом просто перестала отвечать. Хочется перестать гадать и просто знать, где я стою.`

/** English counterpart of the same synthetic entry, for the English demo. */
export const SAMPLE_ENTRY_EN = `Today Anna texted first again, and I caught myself feeling glad and tense at the same time. I feel warm with her, but after every meeting I'm drained and keep replaying everything I said wrong. Yesterday she took five hours to answer my message, and I spent the whole evening sure she was upset with me. She probably just puts up with me out of politeness. I know that if I start talking about what hurts me, we'll fight and I'll end up completely alone. It already happened with Lena: I kept quiet for a long time and then just stopped replying. I want to stop guessing and simply know where I stand.`

export const SAMPLE_ENTRIES = { ru: SAMPLE_ENTRY, en: SAMPLE_ENTRY_EN } as const
