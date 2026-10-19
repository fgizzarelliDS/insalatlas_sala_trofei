# 01 • Architettura & Invarianti Tecniche

## 1. Stack Tecnologico

- **Core Runtime**: TypeScript 5.x compilato con Vite 6.x in modalità Strict.
- **Styling**: Tailwind CSS integrato con variabili CSS native per il dynamic theming su `:root` e classi tema.
- **Vector Icons & Trophy Engine**: FontAwesome 6 affiancato da generatori SVG vettoriali nativi (`src/trophies.ts`) per trofei, coppe e stemmi.
- **Vector Crest Fallback Engine**: Catalogo di 20 stemmi vettoriali geometrici (`public/assets/crests/`) accoppiato a un motore deterministico basato su hashing DJB2 (`src/crests.ts`) per club privi di stemma personalizzato (`public/assets/teams/`).
- **Single Source of Truth & Build Pipeline**: Plugin Vite (`vite.config.ts`) che propaga automaticamente la versione semantica da `package.json` (SSOT) al footer HTML (`index.html`), al Service Worker PWA (`public/sw.js`) e alla costante compile-time TypeScript (`__APP_VERSION__`).
- **Export & Sharing**: `html-to-image` per la cattura HD nativa delle bacheche, delle schede manager, dei record e dei confronti H2H a risoluzione 2.2×; modulo dedicato **Social Story 9:16 (1080×1920)** con safe-zone Instagram & WhatsApp per profili, duelli, rivali a 6 e primati; copia istantanea negli appunti e condivisione formattata su WhatsApp.
- **Testing & Quality Assurance**: Vitest per test unitari e suite di regressione analitica.
- **Hosting & CI/CD**: GitHub Actions con pipeline integrata di test e validazione (`ci.yml`) e compilazione con deploy su GitHub Pages (`deploy.yml`).

**Struttura del Repository**:

```text
insalatlas_sala_trofei/
├── index.html                  # Entry point HTML principale (con version placeholder __APP_VERSION__)
├── package.json                # Dipendenze, script npm e versione semantica SSOT
├── tsconfig.json               # Configurazione TypeScript Strict Mode
├── vite.config.ts              # Configurazione Vite (base path relativa e plugin propagazione versione)
├── .github/workflows/          # CI/CD: pipeline continua di test e validazione (ci.yml) e deploy (deploy.yml)
├── docs/                       # Documentazione tecnica modulare di approfondimento
├── schemas/                    # Contratto JSON Schema Draft-07 (data.schema.json)
├── scripts/                    # Script di supporto e validazione dati Python zero-deps
│   ├── validate.py             # Script di validazione dati Python zero-deps
│   └── export_crests.py        # Generatore dei 20 stemmi SVG vettoriali geometrici
├── public/                     # Asset statici serviti alla radice
│   ├── assets/                 # Asset grafici locali per piena resilienza offline
│   │   ├── crests/             # 20 stemmi vettoriali SVG geometrici per fallback deterministico
│   │   └── teams/              # Stemmi e loghi personalizzati ufficiali dei club
│   ├── data.json               # Single Source of Truth dei dati della lega e archivio competizioni
│   ├── manifest.json           # Manifest PWA per installazione mobile e standalone
│   ├── sw.js                   # Service Worker per caching e supporto offline
│   ├── preview.png             # Immagine di anteprima dell'applicazione
│   └── favicon*.png / .ico     # Icone HD maskable con safe-zone circolare
├── images/                     # Risorse grafiche ed esempi di esportazione
├── css/
│   ├── themes.css              # Variabili custom CSS per le 4 palette cromatiche
│   └── layout.css              # 7-column CSS Grid, mensola trofei e layout responsive
└── src/
    ├── types.ts                # Interfacce TypeScript (Manager, AppState, CompetitionRecord, etc.)
    ├── config.ts               # Pesi di punteggio ufficiali e titoli predefiniti
    ├── state.ts                # Store di stato reattivo condiviso
    ├── score.ts                # Algoritmi di rating ponderato e ordinamento
    ├── trophies.ts             # Generatori SVG vettoriali e banner allenatori
    ├── crests.ts               # Motore deterministico di risoluzione e fallback stemmi squadre
    ├── storage.ts              # Fetch dati, persistenza locale e import/export backup
    ├── ui.ts                   # Gestione temi, notifiche toast e inline editing
    ├── router.ts               # Deep linking e routing hash/query (?manager= / #profile)
    ├── pwa.ts                  # Registrazione Service Worker, install prompt e gestione offline
    ├── main.ts                 # Bootstrap DOM, renderBoard() e bridge globale
    ├── components/
    │   ├── board/              # Tabella albo 7 colonne (tableBoard), archivio stagioni (seasonsArchive) e contatori (statsCounter)
    │   └── modals/             # Scheda profilo (ProfileModal), modale admin e concentrazione
    ├── analytics/              # Motore econometrico (econometrics, tailRisk, archetypes)
    ├── export/                 # Pipeline export HD off-screen (canvas, cardTemplate, share)
    └── __tests__/              # Suite di test unitari, storico e stemmi (Vitest)
```

---

## 2. La Griglia del Tabellone & Motore Dinamico N-Competizioni

La tabella palmarès (`.albo-grid-row`) adotta una struttura a griglia CSS nativa definita in `css/layout.css` e pilotata in modo puramente data-driven dal registro centralizzato `COMPETITION_REGISTRY` in `src/config.ts` (`buildAlboColumns(LEAGUE.features)`).

Nella configurazione predefinita di InsalAtlas (tutte le 6 competizioni storiche + disonori attive), la griglia espone il manager e le colonne registrate:

```text
.albo-grid-row (InsalAtlas: Manager + N Colonne)
├── 1. col-manager      (--col-manager)     : Mister & Presenze (sticky a sinistra)
├── 2. col-championship (--col-championship): Scudetti (Oro, Argento, Bronzo)
├── 3. col-cup          (--col-cup)         : Coppe di Lega (Vittorie & Finali)
├── 4. col-supercup     (--col-supercup)    : Supercoppe di Lega
├── 5. col-mundialito   (--col-mundialito)  : Trofeo Mundialito
├── 6. col-spoon        (--col-spoon)       : Cucchiai di Legno
└── 7. col-cartonato    (--col-cartonato)   : Trofeo Cartonato & Bacheca Allenatori
```

Il motore è completamente generalizzato: supporta $N$ competizioni arbitrarie suddivise in 5 archetipi (`tier3`, `tier2`, `single`, `dishonor`, `banners`).
All'avvio o al resize, `syncAlboGridColumns()` ricalcola dinamicamente le larghezze responsive e la proprietà CSS `--albo-cols`. Per una guida completa all'aggiunta di nuove competizioni, consultare [`docs/05-adding-competitions-guide.md`](05-adding-competitions-guide.md).

> [!CAUTION]
> **Regola Architetturale Invariante**: Non inserire mai wrapper intermedi (`div`, `span`, o contenitori flex) attorno alle colonne dei trofei. I nodi figli della riga devono corrispondere esattamente a quelli definiti in `ALBO_COLUMNS`. L'inserimento di nodi non previsti disallinea le colonne su layout responsive desktop e mobile e corrompe l'allineamento delle mensole trofei. Inoltre, le celle con contenuti multipli larghi (come `banners`) devono mantenere il confinamento locale (`max-w-full overflow-hidden` all'esterno, `overflow-x: auto; scrollbar-none; justify-content: safe center;` all'interno) per impedire qualsiasi sbordamento orizzontale sulle colonne adiacenti.

---

## 3. Motore di Theming Dinamico (CSS Custom Properties)

I temi grafici aggiornano dinamicamente i token definiti in `css/themes.css` su classi tema dedicate (`body.theme-gala`, `body.theme-seriea`, `body.theme-gazzetta`, `body.theme-studio`):

| Token CSS | Gala Dark Gold | Serie A Cyan Night | Gazzetta Rosa Vintage | Clean Studio White |
| :--- | :--- | :--- | :--- | :--- |
| `--table-surface` | `#0f172a` | `#03132e` | `#fff0f3` | `#ffffff` |
| `--accent-color` | `#f59e0b` | `#06b6d4` | `#e11d48` | `#2563eb` |
| `--table-border` | `rgba(255,255,255,0.08)` | `rgba(6,182,212,0.18)` | `rgba(225,29,72,0.15)` | `rgba(0,0,0,0.08)` |
| `--text-main` | `#f8fafc` | `#f0fdf4` | `#1c1917` | `#0f172a` |
| `--text-muted` | `#94a3b8` | `#67e8f9` | `#881337` | `#64748b` |

Tutti i componenti complessi (Trading Cards, modali analitici, cruscotti econometrici) ereditano queste proprietà senza hardcoding di colori nei file TypeScript.

---

## 4. Pipeline Live In-Progress & Privacy Masking Invariant

Per la stagione in corso, l'applicazione supporta il monitoraggio dinamico delle giornate di campionato:

1. **Separazione Dati Grezzi vs Distribuzione Pubblica**:
   - I dati analitici completi (risultati numerici esatti, fantapunti per match, calendari API) risiedono esclusivamente nella directory `data/live/`, rigorosamente ignorata da Git (`.gitignore`).
   - Il compilatore Python (`scripts/core/live_builder.py`) produce il file di distribuzione pubblico [`public/live_season_details.json`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/public/live_season_details.json).
2. **Invariante di Mascheramento dei Risultati (Privacy & Clean UX)**:
   - In `public/live_season_details.json`, i singoli incontri **non contengono mai punteggi numerici di gara o fantapunti decimali**.
   - Ciascun match espone unicamente l'esito qualitativo pre-calcolato: `homeOutcome: 'W' | 'D' | 'L' | null` e `awayOutcome: 'W' | 'D' | 'L' | null`, con `isPlayed: false` e `outcome: null` per gli incontri non ancora disputati.
   - Nelle classifiche in corso, le colonne analitiche numeriche grezze (punti, reti fatte, fantapunti totali) vengono mascherate a favore di posizionamento, forma recente (L5) e badge di momento.
3. **Single Source of Truth per i Club (Option A Inheritance)**:
   - I calendari delle partite registrano unicamente `homeManagerId` e `awayManagerId`.
   - Il compilatore e il client ereditano deterministicamente nome squadra, allenatore e stemma ufficiale dal file di configurazione stagionale (`data/seasons/2026-27.json`). In questo modo, un aggiornamento di stemma o denominazione si propaga all'intero archivio partite senza toccare i file dei round.

