export type PersonaTheme = {
  accent: string
  label: string
}

export const PERSONA_THEME: Record<string, PersonaTheme> = {
  nervous_nick:  { accent: '#c45050', label: 'Anxious'      },
  data_dana:     { accent: '#8ab4f8', label: 'Analyst'      },
  sage_solomon:  { accent: '#b59dff', label: 'Sage'         },
  prof_iris:     { accent: '#7bc49a', label: 'Academic'     },
  balanced_ben:  { accent: '#a8a8a8', label: 'Balanced'     },
  sunny_sarah:   { accent: '#e4c590', label: 'Optimist'     },
  just_jake:     { accent: '#e8e8e8', label: 'Regular'      },
  tinfoil_ted:   { accent: '#e08b5a', label: 'Conspiracy'   },
  full_picture:  { accent: '#7dd3d8', label: 'Full Picture' },
  broke_brandon: { accent: '#d4a574', label: 'Hustler'      },
  geek_gwen:     { accent: '#b59dff', label: 'Insider'      },
}

export function getPersonaTheme(persona?: string): PersonaTheme {
  return PERSONA_THEME[persona || ''] || PERSONA_THEME.just_jake
}
