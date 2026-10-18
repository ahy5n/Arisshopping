// Children's clothes: shops like Primark, Boden and Harrods mix them in with
// women's. Spotted by the title ("Kids'", "3-9 yrs", "(0-18 Months)") or the
// link ("/boys-…"), minus words that only look like it ("boyfriend jeans",
// "babydoll dress", "baby cord", the brand Nobody's Child).

const KID_WORDS =
  /\b(kids?|kid's|children'?s?|child|girls?'?|boys?'?|baby|babies|toddlers?|infants?|newborns?|juniors?|teens?|youth)\b|\b\d{1,2}(?:\.\d)?\s*-\s*\d{1,2}\+?\s*(?:yrs?|years?|months?|mths?)\b|\b\d{1,2}\s*(?:yrs?|years?|mths?|months?)\b/i;
const LOOKALIKES =
  /\b(girlfriend|boyfriend|baby ?doll|baby (?:blue|pink|cord|alpaca|cable|rib|tee|powder|bump)|cowboys?|nobody'?s child|girls? (?:night|trip)|(?:it|cool|bad) girl)\b/gi;
// Monsoon's children's range is numbered 5xx…; women's 1xx, 2xx, 7xx, 8xx
const MONSOON_KIDS = /monsoon\.co\.uk\/.*-5\d{7,}\.html$/i;
const KID_LINK = /\/(?:[a-z-]*\/)?(kids?|children|childrens|girls?|boys?|baby|babies|junior|kidswear|babywear)[/-]/i;

export function isKids(title: string, url = ""): boolean {
  if (KID_WORDS.test(title.replace(LOOKALIKES, " "))) return true;
  if (MONSOON_KIDS.test(url)) return true;
  try {
    return KID_LINK.test(new URL(url).pathname.replace(LOOKALIKES, " "));
  } catch {
    return false;
  }
}

export const notKids = <T extends { title: string; offers: { url: string }[] }>(items: T[]) =>
  items.filter((p) => !isKids(p.title, p.offers[0]?.url));
