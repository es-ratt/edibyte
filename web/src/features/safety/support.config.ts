// SUPPORT CARD: configurable text shown when a wellbeing check-in is flagged, and in Settings.
// To be reviewed by the team's psychologist/dietitian. Add helpline contacts ONLY after checking that
// the number is current and suitable for teenagers in Bangladesh. Never add an unverified number.

import type { LocalText } from './wellbeing.config'

export interface SupportContact {
  name: LocalText
  /** Phone number or URL, exactly as published by the service. */
  contact: string
  /** Where and when the contact was checked. */
  checkedSource: string
  checkedOn: string
}

export interface SupportConfig {
  title: LocalText
  message: LocalText
  contacts: SupportContact[]
}

export const SUPPORT_CONFIG: SupportConfig = {
  title: {
    bn: 'কথা বলার মতো কেউ',
    en: 'Someone to talk to',
    banglish: 'Kotha bolar moto keu',
  },
  message: {
    bn: 'খাবার বা শরীর নিয়ে মন খারাপ লাগলে একা রেখো না। তোমার বিশ্বাসের কারো সাথে কথা বলো: মা-বাবা, ভাই-বোন, শিক্ষক বা একজন ডাক্তার।',
    en: "If food or your body is making you feel low, don't keep it to yourself. Talk to someone you trust: a parent, sibling, teacher or a doctor.",
    banglish: 'Khabar ba shorir niye mon kharap lagle eka rekho na. Tomar bishwasher karo sathe kotha bolo: ma-baba, bhai-bon, shikkhok ba ekjon doctor.',
  },
  contacts: [],
}
