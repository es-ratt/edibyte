// Team: edit the names here. Leave name empty to show the "Name to be added" placeholder.

import type { TKey } from './i18n'

export interface TeamMember {
  role: TKey
  description: TKey
  name: string
}

export const TEAM: TeamMember[] = [
  { role: 'team.r1', description: 'team.r1d', name: '' },
  { role: 'team.r2', description: 'team.r2d', name: '' },
  { role: 'team.r3', description: 'team.r3d', name: '' },
  { role: 'team.r4', description: 'team.r4d', name: '' },
  { role: 'team.r5', description: 'team.r5d', name: '' },
]
