# 04 • Data Schema & Pipeline CI/CD

## 1. Schema JSON Draft-07 (`schemas/data.schema.json`)

I dati storici della lega risiedono in `public/data.json`. La struttura è vincolata dallo schema JSON Draft-07:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "InsalAtlas League Database",
  "type": "object",
  "properties": {
    "leagueData": {
      "type": "array",
      "items": { "$ref": "#/definitions/manager" }
    },
    "managers": {
      "type": "array",
      "items": { "$ref": "#/definitions/manager" }
    },
    "competitions": {
      "type": "array"
    },
    "customTitles": { "type": "object" },
    "titles": { "type": "object" },
    "exportedAt": { "type": "string" }
  },
  "anyOf": [
    { "required": ["leagueData"] },
    { "required": ["managers"] }
  ]
}
```

### Struttura Record Manager

Ogni oggetto manager contiene:

- `id`: Identificativo univoco alfanumerico (es. `m_vannico`).
- `name`: Nome della squadra / fantallenatore.
- `years`: Anni di partecipazione (intero $\ge 1$).
- `gold`, `silver`, `bronze`: Piazzamenti a podio campionato ($\ge 0$).
- `cup_gold`, `cup_silver`: Titoli e secondi posti in Coppa di Lega ($\ge 0$).
- `supercup`, `mundialito`: Titoli in Supercoppa e Mundialito ($\ge 0$).
- `spoon`, `cartonato`: Riconoscimenti di coda ($\ge 0$).
- `coach_banners` / `cartonato_coaches`: Array opzionale di stringhe per i banner personalizzati.

### Struttura Record Competizioni (`competitions`)

L'archivio storico delle singole edizioni e tornei (`CompetitionRecord`) comprende:

- `id`: Identificativo univoco della competizione (es. `2024_25_championship`).
- `name`: Nome esteso della manifestazione (es. `Campionato`, `Coppa di Lega`).
- `season`: Stagione calcistica di riferimento (formato `YYYY/YY`, es. `2024/25`).
- `category`: Tipologia competizione (`championship` | `cup` | `supercup` | `other`).
- `ranking`: Array ordinato dei partecipanti con piazzamento:
  - `rank`: Posizione finale (intero $\ge 1$).
  - `team`: Nome della squadra utilizzata nella specifica annata.
  - `manager`: Nome del fantallenatore associato.
  - `points`: Punteggio complessivo o punti classifica (opzionale).
  - `secondaryRank`: Punteggio o discriminante secondaria (opzionale).

---

## 2. Validatore Locale Python (`scripts/validate.py`)

Uno script indipendente a zero dipendenze consente la verifica dell'integrità dei dati direttamente da terminale o tramite npm:

```bash
# Esecuzione tramite script npm
npm run validate:data

# Oppure esecuzione diretta con l'interprete Python di sistema
python scripts/validate.py
```

Lo script opera con una strategia a due livelli:

- **Validazione Nativa Zero-Deps** (locale): Verifica immediata senza bisogno di installare pacchetti esterni in ambienti di sviluppo:
  - Esistenza dei percorsi target (`schemas/data.schema.json` e `public/data.json`).
  - Parsing valido e conformità del payload JSON.
  - Presenza di tutti i campi obbligatori per ciascun manager (`id`, `name`, `years`, `gold`, `silver`, `bronze`, ecc.).
  - Univocità rigorosa degli ID e regex alfanumerica `^[a-zA-Z0-9_-]+$`.
  - Assenza di interi negativi per trofei e stagioni.
- **Validazione Formale RFC Draft-07**: Se la libreria `jsonschema` è presente nell'ambiente (`pip install jsonschema`), lo script esegue la validazione formale completa a fronte di `schemas/data.schema.json`.

---

## 3. GitHub Actions Workflows

Il repository è protetto e automatizzato da due pipeline principali sotto `.github/workflows/`:

1. **`.github/workflows/ci.yml` (Continuous Integration)**:
   - Si attiva su ogni push verso qualsiasi branch (`**`) e su ogni pull request verso `main`.
   - Include gestione della concorrenza (`cancel-in-progress: true`) per annullare esecuzioni ridondanti su commit ravvicinati.
   - Esegue la pipeline di controllo qualità completa:
     - Allestisce Node.js 24 e Python 3.11.
     - Valida il database JSON a fronte dello schema (`python scripts/validate.py`).
     - Esegue il type-check rigoroso TypeScript (`npm run type-check`).
     - Esegue la suite completa di test unitari con Vitest (`npm test`).
     - Esegue un build di verifica in ambiente di produzione (`npm run build`).
   - Blocca automaticamente il merge o segnala fallimento su commit difettosi prima che possano raggiungere `main`.

2. **`.github/workflows/deploy.yml` (Continuous Deployment)**:
   - Si attiva sui push verso il branch `main` e via trigger manuale (`workflow_dispatch`).
   - Riesegue la validazione formale, i test unitari e la compilazione di produzione.
   - Pubblica automaticamente la cartella `dist/` sull'ambiente GitHub Pages della lega solo se tutti i passaggi hanno avuto esito positivo.
