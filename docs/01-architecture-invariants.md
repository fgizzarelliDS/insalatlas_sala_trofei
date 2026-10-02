# 01 • Architettura & Invarianti Tecniche

## 1. Stack Tecnologico

- **Core Runtime**: TypeScript 5.x compilato con Vite 6.x in modalità Strict.
- **Styling**: Tailwind CSS integrato con variabili CSS native per il dynamic theming su `:root` e classi tema.
- **Vector Icons & Trophy Engine**: FontAwesome 6 affiancato da generatori SVG vettoriali nativi (`src/trophies.ts`) per trofei, coppe e stemmi.
- **Export & Sharing**: `html2canvas` per la cattura HD delle bacheche e delle schede manager a risoluzione 2.2×; copia istantanea negli appunti e condivisione formattata su WhatsApp.
- **Testing & Quality Assurance**: Vitest per test unitari e suite di regressione analitica.
- **Hosting & CI/CD**: GitHub Actions con validazione schema automatica (`validate-data.yml`) e compilazione con deploy su GitHub Pages (`deploy.yml`).

**Struttura del Repository**:

```text
insalatlas_sala_trofei/
├── index.html                  # Entry point HTML principale
├── package.json                # Dipendenze e script npm (dev, build, test, validate:data)
├── tsconfig.json               # Configurazione TypeScript Strict Mode
├── vite.config.ts              # Configurazione Vite (base path relativa)
├── .github/workflows/          # CI/CD: validazione dati (validate-data.yml) e deploy (deploy.yml)
├── docs/                       # Documentazione tecnica modulare di approfondimento
├── schemas/                    # Contratto JSON Schema Draft-07 (data.schema.json)
├── scripts/                    # Script di validazione dati Python zero-deps (validate.py)
├── public/                     # Asset statici serviti alla radice
│   ├── data.json               # Single Source of Truth dei dati della lega
│   ├── manifest.json           # Manifest PWA per installazione mobile e standalone
│   ├── sw.js                   # Service Worker per caching e supporto offline
│   ├── preview.png             # Immagine di anteprima dell'applicazione
│   └── favicon*.png / .ico     # Icone HD maskable con safe-zone circolare
├── images/                     # Risorse grafiche ed esempi di esportazione
├── css/
│   ├── themes.css              # Variabili custom CSS per le 4 palette cromatiche
│   └── layout.css              # 7-column CSS Grid, mensola trofei e layout responsive
└── src/
    ├── types.ts                # Interfacce TypeScript (Manager, AppState, TitlesConfig, etc.)
    ├── config.ts               # Pesi di punteggio ufficiali e titoli predefiniti
    ├── state.ts                # Store di stato reattivo condiviso
    ├── score.ts                # Algoritmi di rating ponderato e ordinamento
    ├── trophies.ts             # Generatori SVG vettoriali e banner allenatori
    ├── storage.ts              # Fetch dati, persistenza locale e import/export backup
    ├── ui.ts                   # Gestione temi, notifiche toast e inline editing
    ├── router.ts               # Deep linking e routing hash/query (?manager= / #profile)
    ├── pwa.ts                  # Registrazione Service Worker, install prompt e gestione offline
    ├── main.ts                 # Bootstrap DOM, renderBoard() e bridge globale
    ├── components/
    │   ├── board/              # Tabella albo 7 colonne (tableBoard) e contatori (statsCounter)
    │   └── modals/             # Scheda profilo (ProfileModal), modale admin e concentrazione
    ├── analytics/              # Motore econometrico (econometrics, tailRisk, archetypes)
    ├── export/                 # Pipeline export HD off-screen (canvas, cardTemplate, share)
    └── __tests__/              # Suite di test unitari e regressione analitica (Vitest)
```

---

## 2. La Griglia a 7 Colonne

La tabella palmarès (`.albo-grid-row`) adotta una struttura a griglia CSS nativa definita in `css/layout.css`:

```text
.albo-grid-row
├── 1. col-manager      (--col-manager)     : Mister & Presenze (sticky a sinistra)
├── 2. col-championship (--col-championship): Scudetti (Oro, Argento, Bronzo)
├── 3. col-spoon        (--col-spoon)       : Cucchiai di Legno
├── 4. col-cup          (--col-cup)         : Coppe di Lega (Vittorie & Finali)
├── 5. col-supercup     (--col-supercup)    : Supercoppe di Lega
├── 6. col-mundialito   (--col-mundialito)  : Trofeo Mundialito
└── 7. col-cartonato    (--col-cartonato)   : Trofeo Cartonato & Bacheca Allenatori
```

> [!CAUTION]
> **Regola Architetturale Invariante**: Non inserire mai wrapper intermedi (`div`, `span`, o contenitori flex) attorno alle colonne dei trofei. La rottura dei 7 nodi figli disallinea le colonne su layout responsive desktop e mobile e corrompe l'allineamento delle mensole trofei.

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
