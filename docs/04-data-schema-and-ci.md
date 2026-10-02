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

Il repository è protetto da due pipeline automatizzate sotto `.github/workflows/`:

1. **`.github/workflows/validate-data.yml`**:
   - Si attiva su ogni push e pull request che modifica `public/data.json`, `schemas/**` o `scripts/**`.
   - Allestisce l'ambiente Python 3.11, installa `jsonschema` ed esegue `python scripts/validate.py`.
   - Blocca automaticamente il merge se il database viola il contratto dati.
2. **`.github/workflows/deploy.yml`**:
   - Si attiva sui push verso il branch `main`.
   - Allestisce l'ambiente Python e valida l'integrità del database JSON (`python scripts/validate.py`).
   - Esegue la suite completa di test unitari con Vitest (`npm test`).
   - Compila i sorgenti con TypeScript Strict e Vite (`npm run build`).
   - Pubblica automaticamente la cartella `dist/` su GitHub Pages solo a seguito del superamento di tutti i controlli di qualità.
