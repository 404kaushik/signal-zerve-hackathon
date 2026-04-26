export type XPersona = {
  id: string
  name: string
  handle: string
  seed: string
}

export const X_PERSONAS: XPersona[] = [
  { id: 'nervous_nick', name: 'Nervous Nick', handle: '@nervous_nick', seed: 'anxious-risk-alert' },
  { id: 'data_dana', name: 'Data Dana', handle: '@data_dana', seed: 'analytics-metrics-chart' },
  { id: 'sage_solomon', name: 'Sage Solomon', handle: '@sage_solomon', seed: 'wisdom-ancient-sage' },
  { id: 'prof_iris', name: 'Prof. Iris', handle: '@prof_iris', seed: 'academic-research-iris' },
  { id: 'balanced_ben', name: 'Balanced Ben', handle: '@balanced_ben', seed: 'balance-moderate-zen' },
  { id: 'sunny_sarah', name: 'Sunny Sarah', handle: '@sunny_sarah', seed: 'optimistic-sun-bright' },
  { id: 'just_jake', name: 'Just Jake', handle: '@just_jake', seed: 'regular-coffee-morning' },
  { id: 'tinfoil_ted', name: 'Tinfoil Ted', handle: '@tinfoil_ted', seed: 'conspiracy-red-string-board' },
  { id: 'full_picture', name: 'Full Picture', handle: '@full_picture', seed: 'complete-context-clarity' },
  { id: 'broke_brandon', name: 'Broke Brandon', handle: '@broke_brandon', seed: 'hustle-grind-laptop-coffee' },
  { id: 'geek_gwen', name: 'Geek Gwen', handle: '@geek_gwen', seed: 'nerd-tech-gadget-code' },
]

export const X_PERSONA_MAP = Object.fromEntries(X_PERSONAS.map((persona) => [persona.id, persona])) as Record<string, XPersona>
