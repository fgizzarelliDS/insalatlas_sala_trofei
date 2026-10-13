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
- `history`: Cronologia delle singole stagioni disputate dal fantallenatore:
  - `season`: Anno sportivo (formato `YYYY/YY`, es. `2024/25`).
  - `team`: Nome della squadra schierata.
  - `rank`: Posizione finale in campionato (o `null`).
  - `points`: Punteggio complessivo regular season (o `null`).
  - `in_progress`: Flag booleano opzionale (`true` per campionati attualmente in corso).
  - `achievements`: Riconoscimenti e badge conseguiti nell'annata.

### Struttura Record Competizioni (`competitions`)

L'archivio storico delle singole edizioni e tornei (`CompetitionRecord`) comprende:

- `id`: Identificativo numerico o univoco della competizione (es. `863632`).
- `name`: Nome esteso della manifestazione (es. `Serie Atlas 2024-2025`, `Coppa InsalAtlas`).
- `season`: Stagione calcistica di riferimento (formato `YYYY/YY`, es. `2024/25`).
- `category`: Tipologia competizione (`Campionato` | `Coppa` | `Supercoppa` | `Mundialito` | `Perdenti`).
- `in_progress`: Flag booleano (`true` se il torneo è ancora in svolgimento).
- `status`: Stato del torneo (`'in_progress'` | `'completed'`).
- `ranking`: Array ordinato dei partecipanti con piazzamento:
  - `rank`: Posizione finale (intero $\ge 1$).
  - `teamName`: Nome della squadra utilizzata nella specifica annata.
  - `coach`: Nome del fantallenatore / banner.
  - `managerId`: Identificativo del manager corrispondente in `leagueData`.
  - `points`: Punteggio complessivo o punti classifica.
  - `logo`: Percorso allo stemma personalizzato del club (opzionale).

---

## 2. Pipeline Dati & Validazione Locale Python

Il progetto include due strumenti Python autonomi a zero dipendenze per l'elaborazione e la verifica:

### 2.1 Compilatore Database (`scripts/build_data.py`)

Compila ed esporta il database unificato direttamente in `public/data.json`, integrato nei lifecycle hook di npm (`pretest`, `prebuild`):

```bash
# Esecuzione manuale da terminale o npm
npm run build:data
# oppure: python scripts/build_data.py
```

### 2.2 Validatore Locale (`scripts/validate.py`)

Verifica l'integrità strutturale del database JSON:

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
