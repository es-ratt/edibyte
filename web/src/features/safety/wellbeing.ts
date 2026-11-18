import type { WellbeingConfig } from './wellbeing.config'

/** The check-in is offered only when a reviewer approved a non-empty question list. */
export function checkInAvailable(config: WellbeingConfig): boolean {
  return config.reviewedBy !== null && config.reviewedBy.trim() !== '' && config.questions.length > 0
}

/** answers: questionId -> optionId. Flagged when any chosen option is marked flag. */
export function isFlagged(config: WellbeingConfig, answers: Record<string, string>): boolean {
  return config.questions.some((q) => q.options.some((o) => o.flag && answers[q.id] === o.id))
}

export function allAnswered(config: WellbeingConfig, answers: Record<string, string>): boolean {
  return config.questions.every((q) => q.options.some((o) => answers[q.id] === o.id))
}
