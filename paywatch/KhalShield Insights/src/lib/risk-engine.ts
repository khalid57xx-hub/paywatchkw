export interface TransactionInput {
  amount: number;
  recipient: string;
  country: string;
  category: string;
  description: string;
}

export interface RiskReason {
  label: string;
  points: number;
  kind: "increase" | "decrease";
}

export interface RiskResult {
  score: number;
  level: "LOW RISK" | "MEDIUM RISK" | "HIGH RISK";
  reasons: RiskReason[];
}

export const HIGH_RISK_COUNTRIES = [
  "Nigeria", "Russia", "North Korea", "Iran", "Venezuela", "Belarus",
];

const URGENCY_WORDS = [
  "urgent", "immediately", "asap", "now", "hurry", "last chance",
  "act fast", "limited time", "final notice", "overdue", "suspend",
  "verify your account", "click here", "wire transfer", "gift card",
  "bitcoin", "crypto", "don't tell", "keep secret", "confidential",
];

const HIGH_RISK_CATEGORIES = ["crypto", "gift cards", "gambling", "wire transfer"];

export function analyzeTransaction(tx: TransactionInput): RiskResult {
  const reasons: RiskReason[] = [];
  let score = 12; // base score

  // Amount
  if (tx.amount >= 10000) {
    score += 35;
    reasons.push({ label: "Very high transaction amount (≥ 10,000)", points: 35, kind: "increase" });
  } else if (tx.amount >= 5000) {
    score += 25;
    reasons.push({ label: "High transaction amount (≥ 5,000)", points: 25, kind: "increase" });
  } else if (tx.amount >= 1000) {
    score += 12;
    reasons.push({ label: "Elevated transaction amount (≥ 1,000)", points: 12, kind: "increase" });
  } else {
    reasons.push({ label: "Transaction amount within typical range", points: 0, kind: "decrease" });
  }

  // Recipient
  const recipient = tx.recipient.trim();
  if (recipient.length > 0) {
    const isNew = !/^[a-z0-9 .@'-]{3,}$/i.test(recipient) || recipient.length < 3;
    if (isNew) {
      score += 10;
      reasons.push({ label: "Recipient identity looks unusual or incomplete", points: 10, kind: "increase" });
    } else {
      score += 15;
      reasons.push({ label: "Recipient not found in trusted contacts — treated as new", points: 15, kind: "increase" });
    }
  }

  // Country
  const domestic = ["united states", "usa", "us", "kuwait", "home"];
  const countryLower = tx.country.trim().toLowerCase();
  if (countryLower && !domestic.includes(countryLower)) {
    score += 18;
    reasons.push({ label: `International transaction (${tx.country})`, points: 18, kind: "increase" });
    if (HIGH_RISK_COUNTRIES.some((c) => c.toLowerCase() === countryLower)) {
      score += 15;
      reasons.push({ label: "Destination is a high-risk jurisdiction", points: 15, kind: "increase" });
    }
  } else if (countryLower) {
    reasons.push({ label: "Domestic transaction", points: 0, kind: "decrease" });
  }

  // Category
  const catLower = tx.category.trim().toLowerCase();
  if (HIGH_RISK_CATEGORIES.some((c) => catLower.includes(c))) {
    score += 15;
    reasons.push({ label: `High-risk category: ${tx.category}`, points: 15, kind: "increase" });
  }

  // Description — urgency/pressure words
  const descLower = tx.description.toLowerCase();
  const hits = URGENCY_WORDS.filter((w) => descLower.includes(w));
  if (hits.length > 0) {
    const pts = Math.min(10 + hits.length * 5, 30);
    score += pts;
    reasons.push({
      label: `Urgency or pressure language detected ("${hits.slice(0, 3).join('", "')}"${hits.length > 3 ? ", …" : ""})`,
      points: pts,
      kind: "increase",
    });
  } else if (tx.description.trim().length > 0) {
    score -= 5;
    reasons.push({ label: "Description reads neutral — no pressure language", points: -5, kind: "decrease" });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const level = score >= 60 ? "HIGH RISK" : score >= 30 ? "MEDIUM RISK" : "LOW RISK";
  if (reasons.length === 0) {
    reasons.push({ label: "No significant risk signals detected", points: 0, kind: "decrease" });
  }
  return { score, level, reasons };
}
