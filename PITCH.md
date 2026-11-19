# EdiByte: pitch and 90-second demo

**Team Qbits · International AI Builders Congress 2026 · Idea to Unicorn · Nutrition Intelligence**
Live demo: https://es-ratt.github.io/edibyte/

---

## 1. Problem

- Bangladeshi teenagers eat a mix of home food (bhat, dal, shak, mach) and street, fast and packaged food (fuchka, singara, burgers, soft drinks).
- Nutrition apps are built for Western foods, English and adult weight loss. They show confident numbers from a photo that cannot be that precise.
- For teens, calorie counting and weight-focused tracking carry a real risk: a 2025 systematic review (PubMed 39671845) links diet-tracking apps, especially tracking for weight or shape and frequent use, with more disordered-eating symptoms; adolescents are under-researched.

## 2. Solution

**"Is this meal right for me?"**, answered in Bangla, English or Banglish, before eating.

1. **Profile** with teen mode (automatic under 18): no weight-loss goals, no calorie headline, no scores or streaks.
2. **Photo or typed meal**, the AI only *names* the foods; the user confirms foods and household portions (bati, plate, piece) and answers what a photo cannot show (oil, fried, sugar spoons).
3. **Result**: a gentle verdict, plate balance, "get enough" and "go easy" sections with ranges, confidence and a source on every number, add-ons and swaps that respect diet and avoid-list.
4. **Coach** for follow-up questions, answering only from approved data with citations.
5. **Progress** by weekly habits (vegetables, protein, sugary drinks, fried food), one rule-based suggestion a week, and **plans** with a pre-check and built-in treat days.

## 3. Trust model (why judges can believe the numbers)

| Promise | How it is enforced |
|---|---|
| AI never produces nutrition numbers | It may only name foods; every number comes from a deterministic engine over a food table |
| Honest about uncertainty | Every amount is a range with a High / Medium / Low confidence chip |
| Unknown is not zero | Missing nutrients show "not in our data yet" |
| Targets need a source | Only WHO values loaded from the fact sheet with URL and date; teen targets say "pending expert review" |
| AI answers are checked | Any number in a coach answer that is not in the retrieved data discards the answer |
| Safety | Conditions get general WHO guidance + "see a doctor"; allergies get "I can't verify this"; teen weight-loss questions go to a doctor |
| Privacy | Profile, meals and plans stay on the phone; photos are never stored; logs hold no user text |

## 4. Status and measured results (honest)

| | Status |
|---|---|
| App | All planned screens built and live (demo mode); backend ready for one-click Render deploy |
| Quality | 137 backend tests, 129 frontend tests, 5 end-to-end flows, axe accessibility on all 11 screens, colour contrast checked in a real browser, all in CI |
| Lighthouse (mobile) | Accessibility 100, Best Practices 100, SEO 100, Performance 79-92 |
| Food data | 48 foods, **all unverified team estimates** (labelled in the app); reuse permission for the Food Composition Table for Bangladesh is being requested from INFS |
| Accuracy | **Not measured yet.** Tooling is ready: 100+ meals weighed on a kitchen scale, error reported per nutrient, failures included |
| Pilot | **Not run yet.** Anonymous adoption events and the protected impact summary are built (return rates, meals per user, time to log, habit change baseline vs latest week) |

We will only present pilot and accuracy numbers that the tooling actually produced.

## 5. Business model (options, not projections)

- **Free for teens**, always. No ads aimed at minors, no selling data.
- **Schools and coaching centres**: a class or canteen version (anonymous, aggregate habit trends for school health programmes).
- **NGO and public-health partners**: nutrition programmes that need a Bangla-first, evidence-labelled tool and aggregate outcome proxies.
- **Food-data services**: the verified Bangladeshi dish and street-food dataset (built with INFS / dietitian review) licensed to researchers and other apps.

## 6. Competitors

| Category | Gap EdiByte fills |
|---|---|
| Global calorie trackers (for example MyFitnessPal, Yazio) | Western food databases, English, adult calorie and weight focus |
| Photo-to-calorie AI apps | Single confident numbers from a photo, no confirmation step, no sources |
| General chatbots | Can invent numbers; no food table, no teen safety rules |
| Paper guidelines and school talks | Not personal, not in the moment of eating |

## 7. 90-second demo script

Before: open the live demo on a phone; if the API is deployed, open `/health` 5 minutes earlier to wake it.

| Time | Do | Say |
|---|---|---|
| 0:00 | Welcome screen in Bangla | "Before you eat: is this meal right for **me**? In Bangla, English or Banglish." |
| 0:10 | Onboard as a 15-year-old | "Under 18, teen mode is automatic: no weight-loss goals, no calorie counting." |
| 0:20 | Photo → pick an image | "The AI only names the foods. It never gives numbers." |
| 0:30 | Confirm screen: point at "Not sure" | "The user confirms foods and portions, and answers what a photo can't show." |
| 0:40 | Check my meal → result | "A gentle verdict, plate balance, and every number with a range, confidence and source. What we don't have, we say." |
| 0:55 | Ask the coach "How much sugar is okay?" | "Answers come only from approved sources, with citations." |
| 1:05 | Type "what should I eat for diabetes" | "Health conditions get general guidance and 'see a doctor', never a diagnosis." |
| 1:15 | Progress → Week | "Progress is weekly habits, not scores. One suggestion a week, chosen by rules." |
| 1:25 | Data page | "And we show exactly what is verified and what is not." |

## 8. Questions judges may ask (honest answers)

- **Are the numbers accurate?** The engine is deterministic and every number is traceable, but today's food table is unverified team estimates, clearly labelled. Accuracy will be published from weighed meals, failures included.
- **Why not just ChatGPT?** It can invent numbers. EdiByte's AI never produces numbers, the user confirms every item, and answers are checked against the data.
- **Is it safe for teens?** Teen mode removes weight-loss goals, calorie headlines, scores and streaks; there are pause-tracking and hide-numbers switches and a wellbeing check-in whose questions must come from a qualified reviewer.
- **What about privacy and minors?** Local-first, no accounts, photos never stored. Parental consent and legal review are open items before any public pilot with minors.
- **What if the AI is unavailable?** Typed meals, the engine and the coach still work offline from the same data.
