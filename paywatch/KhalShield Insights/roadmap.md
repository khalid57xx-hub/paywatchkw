# PayWatch roadmap

- [x] Switch AI assessment backend from Lovable AI to Google Gemini API (secret GEMINI_API_KEY, server-side only)
- [x] Save GEMINI_API_KEY via secure form with AQ. Authorization Key format hint
- [x] Verify live: deterministic score unchanged, Gemini assessment renders
- [x] Simple email/password authentication: sign up, log in, log out, session persists
- [ ] Save analyzed transactions per user — MongoDB Atlas not reachable from this app's hosting; awaiting user decision on built-in database
