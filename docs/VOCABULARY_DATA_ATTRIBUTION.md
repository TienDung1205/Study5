# Vocabulary data attribution

The generated vocabulary bank combines and modifies data from these sources:

- English–Vietnamese Dictionary Database by Skypedia, licensed under CC BY-SA 4.0: https://github.com/skypediacode/english-vietnamese-dictionary
- Google 10,000 English frequency list by first20hours, MIT licensed: https://github.com/first20hours/google-10000-english
- English-to-Vietnamese example translations generated with Helsinki-NLP OPUS-MT (`opus-mt-en-vi`), Apache-2.0: https://huggingface.co/Helsinki-NLP/opus-mt-en-vi

The vocabulary subset in `backend/prisma/data/vocabulary-bank.json` is modified for TOEIC Quest by ranking entries, selecting one Vietnamese sense and American-English IPA, assigning TOEIC target bands, and pairing examples with Vietnamese machine translations. The derived vocabulary data is distributed under CC BY-SA 4.0. Machine-generated translations require human review.

## Rebuild the vocabulary bank

The generator uses the built-in `node:sqlite` module, so rebuilding requires Node.js 22 or newer. The web application itself can still use the version declared in the root `package.json`.

From the project root, prepare the ignored source folders once:

```powershell
git clone https://github.com/skypediacode/english-vietnamese-dictionary storage/vocabulary-source
git clone https://github.com/first20hours/google-10000-english storage/frequency-source
npm install
npm run vocabulary:build
```

The first translation run downloads the OPUS-MT model into the ignored `storage/model-cache` folder and writes a translation cache to `storage/vocabulary-translation-cache.json`. The generated, tracked result is `backend/prisma/data/vocabulary-bank.json`.

After rebuilding, verify and load it with:

```powershell
npm test
npm run prisma:seed
```
