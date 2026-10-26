# EdiByte: 3-minute pitch and demo script

Check first: open `https://<your-api>.onrender.com/health` 5 minutes before (wakes the free server) and confirm `"mode": "ai"`. Keep a screen recording as a backup.

## Script

**0:00 Problem (20 s).** "Nutrition apps are built for Western food and English. A student in Dhaka eating bhat, dal and dim has nothing that understands that, or understands Banglish."

**0:20 Demo 1: log a meal (60 s).**
Press **Try Demo** → the Bangla meal is filled in → **Check my meal**.
Say: "The AI only reads the words. Now **I** review the items, because AI makes mistakes." Fix one item to show control → **See my report**.
Say: "Every number comes from a food table, not from the AI. No hallucinated calories."

**1:20 Demo 2: it adapts (20 s).** Switch the demo profile (student on a budget vs muscle gain). Targets and tips change.

**1:40 Demo 3: the coach speaks your language (40 s).** Type in Banglish: *"kom khoroche protein kothay pabo?"* → answer comes back in Banglish. Then Bangla, then English: the answer follows the language typed.

**2:20 Demo 4: it is safe (20 s).** Type *"ami diabetes er jonno ki khabo"* → kind redirect to a doctor, no advice.

**2:40 Close (20 s).** Show **History** (weekly calories vs target). "Works offline too, private by design, open source. Next: sourced food data, real prices, voice input."

## Questions judges are likely to ask (honest answers)

- **"Are the nutrition numbers accurate?"** The calculation is deterministic from a food table, so the AI cannot invent numbers. The current table is a sample we are replacing with sourced data (see `docs/DATA_VERIFICATION.md`). We say this in the app.
- **"How did you evaluate it?"** 34 team-written meals across Bangla, English, Banglish and mixed, measuring food matching only, plus automated tests in CI. We have not yet run it with real users.
- **"What stops harmful advice?"** Guardrails redirect medical, pregnancy and extreme-diet questions, calorie targets have a safe floor, and the model may only answer from retrieved data.
- **"What if the AI is down?"** It falls back to rule-based mode and labels it "Offline mode".
- **"Why not just use ChatGPT?"** Numbers are grounded in a table you can inspect, the user reviews every item, it understands Banglish, and it has safety rules built in.
- **"Privacy?"** No account needed; profile, chat and history stay in the browser; server logs do not store what users type.
