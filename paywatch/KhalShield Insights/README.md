# KhalShield Insights

Create a web app called KhalShield with the tagline “Think before you pay.”

Build only the core MVP for today.

Core Feature

Create a transaction risk analyzer where the user enters:

Amount

Recipient

Country

Category

Description

Add a prominent “Analyze Transaction” button.

When clicked, analyze the transaction using a deterministic risk-scoring system and return:

Risk Score from 0–100

Risk Level: LOW RISK, MEDIUM RISK, or HIGH RISK

Clear reasons explaining why the score was given

Use these example rules:

High transaction amount → increase risk

New recipient → increase risk

International transaction → increase risk

Urgency or pressure words in the description → increase risk

Show a short scanning/loading animation before displaying the result.

Design

Make the UI futuristic, premium, and professional, combining FinTech + Cybersecurity.
Use:

Dark premium interface

Subtle glassmorphism

Shield-inspired visual identity

Large, clear Risk Score

Clean modern typography

Subtle animations

Fully responsive design

The app should feel like a real financial security product, not a generic dashboard.

Scope

For this first version, do NOT add:

MongoDB

Stripe

Gemini API

Authentication

GitHub features

Extra dashboards

Unrelated features

Focus on making the Analyze Transaction feature work reliably and keeping the design polished.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://foresight-pay.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/047b6f5a-bc51-473f-9108-9fa8de7bdabb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
