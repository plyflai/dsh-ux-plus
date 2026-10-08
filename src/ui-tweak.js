import z from '@deepseek-ai/schemastery'

/** Stable host entry id for the typography configuration form. */
export const name = 'dsh-ux-plus/ui-tweak'

/** Host configuration consumed by the new DSH config-forms service. */
export const Config = z.object({
  fontSize: z.union(['xs', 's', 'm', 'l', 'xl']).default('l'),
  chatWidth: z.union(['s', 'm', 'l', 'xl']).default('l'),
}).volatile()

/** This entry only contributes configuration; the main UX Plus entry owns behavior. */
export function apply() {
  return () => {}
}
