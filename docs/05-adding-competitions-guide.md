# 05 • Guida: Aggiungere una Nuova Competizione (Registry Dinamico)

Il motore di **InsalAtlas Sala Trofei** integra un'architettura **Data-Driven ad $N$-Competizioni** (introdotta con la SPEC 16) che astrae completamente la gestione dei tornei. 

Non esistono più logiche o colonne cablate nel codice sorgente: ogni competizione è un cittadino di prima classe configurato all'interno del registro centrale (`COMPETITION_REGISTRY`), e tutti i moduli (tabellone, ordinamento, ranking rating, contatori, modali albo d'oro, esportazioni HD in canvas) si adattano dinamicamente in modo automatico.

---

## 1. Single Source of Truth: `COMPETITION_REGISTRY`

La sorgente unica di verità per tutte le competizioni si trova in [`src/config.ts`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/src/config.ts).

Ogni elemento del registro implementa l'interfaccia [`CompetitionDefinition`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/src/types.ts):

```typescript
export interface CompetitionDefinition {
  id: string;                                   // Identificativo univoco (slug)
  name: string;                                 // Nome visualizzato completo
  shortName: string;                            // Etichetta compatta (header tabella, badge)
  category: string;                             // Categoria semantica (per raggruppamenti e stats)
  nameKeywords: string[];                       // Parole chiave per auto-matching nei tabellini
  trophyIcon: TrophyType;                       // Icona SVG vettoriale del trofeo principale (oro)
  silverTrophyIcon?: TrophyType;                // Icona argento (per tier3 e tier2)
  bronzeTrophyIcon?: TrophyType;                // Icona bronzo (per tier3)
  type: CompetitionArchetype;                   // Uno dei 5 archetipi supportati
  scoringPoints: {                              // Pesi per il calcolo del Palmarès Score
    gold: number;
    silver?: number;
    bronze?: number;
  };
  grid: {                                       // Dimensionamento CSS Grid
    desktopTrack: string;                       // Es. 'minmax(100px, 0.8fr)' o '120px'
    desktopWidthPx: number;                     // Larghezza stimata per esportazione canvas HD
    mobileWidthPx: number;                      // Larghezza traccia fissa su schermi < 768px
  };
  cardIcon?: string;                            // Emoji/icona opzionale per la card in alto (default: '🏆')
  cardBadgeStyle?: string;                      // Stile CSS/Tailwind per il badge icona (default: 'bg-amber-500/20 text-amber-400')
  order: number;                                // Ordine sequenziale orizzontale
  enabled: boolean;                             // Flag di attivazione (da LEAGUE.features o costante)
}
```

---

## 2. I 5 Archetipi di Competizione (`CompetitionArchetype`)

Il sistema supporta 5 archetipi distinti, ciascuno con regole di rendering, medaglie e conteggi dedicati:

| Archetipo | Descrizione | Livelli Gestiti | Esempio Tipico |
| :--- | :--- | :--- | :--- |
| **`tier3`** | Torneo con podio olimpico a tre livelli. | Oro (1°), Argento (2°), Bronzo (3°) | Campionato / Serie A |
| **`tier2`** | Torneo a eliminazione diretta a due livelli. | Oro (Vincitore), Argento (Finalista) | Coppa di Lega / Coppa Italia |
| **`single`** | Torneo secco a vincitore singolo. | Oro (Vincitore unico) | Supercoppa, Mundialito, Torneo Invernale |
| **`dishonor`** | Titolo negativo / disonore singolo. | Oro (Ultimo classificato) | Cucchiaio di Legno |
| **`banners`** | Playout negativo con banner allenatore nominativi. | Oro (Sconfitta playout) + Lista Coach | Trofeo Cartonato |

---

## 3. Guida Passo-Passo: Aggiungere una Nuova Competizione

Ipotizziamo di voler aggiungere una nuova competizione: **"Champions League Fantacalcio"** (torneo a due livelli: vincitore e finalista, valore 3.5 punti vittoria e 1.5 finale).

### Passo 1: Registrazione in `src/config.ts`

Apri [`src/config.ts`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/src/config.ts) e aggiungi la definizione nell'array `COMPETITION_REGISTRY`:

```typescript
export const COMPETITION_REGISTRY: CompetitionDefinition[] = [
  // ... competizioni esistenti ...
  {
    id: 'champions',
    name: 'Champions League',
    shortName: 'Champions',
    category: 'Coppa',
    nameKeywords: ['champions', 'coppa campioni', 'ucl'],
    trophyIcon: 'gold_cup',           // oppure una nuova icona dedicata
    silverTrophyIcon: 'silver_cup',
    type: 'tier2',
    scoringPoints: { gold: 3.5, silver: 1.5 },
    grid: { 
      desktopTrack: 'minmax(110px, 0.9fr)', 
      desktopWidthPx: 120, 
      mobileWidthPx: 95 
    },
    order: 8,
    enabled: true                     // o collegato a LEAGUE.features.champions
  }
];
```

> [!TIP]
> Se desideri rendere la competizione attivabile o disattivabile per ciascuna lega nella multi-tenant architecture, aggiungi il flag in `LeagueFeatures` in [`src/types.ts`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/src/types.ts) e configuralo in `LEAGUE.features` in [`src/config.ts`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/src/config.ts).

### Passo 2: Aggiunta dell'Icona Vettoriale (Opzionale)

Se la competizione richiede una grafica vettoriale personalizzata:
1. Inserisci il nuovo tipo in `TrophyType` in [`src/types.ts`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/src/types.ts).
2. Aggiungi il caso di rendering in `renderTrophySVG(type)` in [`src/trophies.ts`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/src/trophies.ts).
Se utilizzi un'icona già esistente (`'scudetto'`, `'gold_cup'`, `'supercup'`, `'mundialito'`, ecc.), non è richiesta alcuna modifica al generatore SVG!

### Passo 3: Variabili CSS Grid in `css/layout.css`

Aggiungi la variabile CSS per il nuovo track in [`css/layout.css`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/css/layout.css):

```css
:root {
  /* ... */
  --col-champions: minmax(110px, 0.9fr);
}

@media (max-width: 767px) {
  :root {
    /* ... */
    --col-champions: 95px;
  }
}
```

> [!NOTE]
> All'avvio dell'applicazione e al resize della viewport, la funzione `syncAlboGridColumns()` in `src/components/board/tableBoard.ts` sincronizza automaticamente sia le singole variabili CSS (`--col-[id]`) che la sequenza completa `--albo-cols` leggendo le proprietà da `COMPETITION_REGISTRY`.

### Passo 4: Popolamento dei Dati Storici e Compilazione Automatica

I dati della competizione possono essere inseriti nei tabellini stagionali e nelle bacheche dei manager:

1. **Nei tabellini stagionali** (`seasons[].competitions` in `public/data.json` o file sorgente):
   ```json
   {
     "name": "Champions League 2023/24",
     "winner": "FC Santa Cruz",
     "finalist": "Lokomotiv D'Aversa"
   }
   ```
   Il motore estrattore (`scripts/core/extractor.py`) mapperà automaticamente il trofeo al rispettivo manager e ID competizione grazie a `nameKeywords: ['champions']`.

2. **Nel file dei manager (`data/managers.json`)**:
   I trofei possono essere assegnati a livello di singolo mister:
   ```json
   {
     "id": "gigi",
     "name": "Gigi",
     "trophies": {
       "champions": 1
     }
   }
   ```
   oppure specificando singoli tier (es. `"champions_gold": 1`, `"champions_silver": 1`).

> [!IMPORTANT]
> **Omogeneità Automatica dello Schema JSON (`builder.py`)**:
> Quando esegui `npm run build:data`, lo script [`scripts/core/builder.py`](file:///Users/fgizzarelli/Desktop/projects/insalatlas_sala_trofei/scripts/core/builder.py) analizza tutti i manager, raccoglie l'insieme completo delle chiavi trofeo personalizzate (es. `champions`) e le inizializza automaticamente a `0` per tutti gli altri manager in `public/data.json`.
> In questo modo la forma del JSON generato rimane al 100% omogenea, garantendo che TypeScript interpreti il campo `trophies: Record<string, number>` senza generare errori di inferenza (come `champions?: undefined`).

---

## 4. Aggiornamenti Automatici del Sistema (Zero-Code)

Una volta inserita la definizione in `COMPETITION_REGISTRY`, il motore gestisce automaticamente senza codice aggiuntivo:

1. **Tabellone Albo d'Oro**:
   - Nuova colonna renderizzata sia in modalità icone multiple che in modalità badge compatti.
   - Header dinamico con supporto all'inline editing e tooltip.
2. **Ordinamento Multi-Criterio**:
   - Disponibilità automatica dell'opzione di sorting `[id]_desc` nel menu di ordinamento (es. `champions_desc`).
3. **Calcolo Punteggi Palmarès**:
   - Aggiornamento della formula `calculateScore()` pesando i punti configurati in `scoringPoints`.
   - Aggiornamento del conteggio trofei positivi (`getManagerTotalTrophies()`).
4. **Top Summary Cards Dinamiche**:
   - `renderTopStatsCards()` genera automaticamente in cima al tabellone una card dedicata per ogni competizione attiva in `COMPETITION_REGISTRY` (oltre alla card globale "Stagioni").
   - Il layout a griglia utilizza classi Tailwind responsive statiche (fino a 4 colonne `lg:grid-cols-4` per 7+ card, `lg:grid-cols-6` per 6 card, ecc.) per prevenire la purge del compilatore JIT.
   - Ogni card mostra il conteggio all-time aggiornato in tempo reale e, cliccandovi sopra, invoca `openTrophyModal(comp.id)` aprendo direttamente la cronologia storica dell'Albo d'Oro.
5. **Modale Albo d'Oro Storico**:
   - Cliccando sul titolo dell'header o sulla card riassuntiva, si apre il modale generico con lo storico di tutte le edizioni, i vincitori, finalisti e le pillole delle stagioni con link diretto.
6. **Esportazione HD su Canvas**:
   - Il modulo `src/export/renderers/albo.ts` calcola la larghezza totale del canvas HD sommando dinamicamente `desktopWidthPx` di tutte le colonne attive, garantendo esportazioni perfette senza troncamenti.

---

## 5. Regole Invarianti per il Layout Mobile & Overflow

Per evitare disallineamenti o sovrapposizioni tra colonne su schermi mobile (viewports < 768px):

1. **Contenimento Orizzontale (`max-w-full overflow-hidden`)**:
   Ogni cella di riga della griglia deve rimanere rigorosamente all'interno del proprio track CSS.
2. **Larghezze Minime per Archetipi Complessi**:
   Per archetipi con contenuti multipli larghi (come `banners`, che visualizza i distintivi degli allenatori esonerati), la traccia mobile deve avere una larghezza sufficiente (es. `175px`).
3. **Safe Centering con Scorrimento Interno**:
   I contenitori interni a scorrimento orizzontale devono utilizzare `style="justify-content: safe center;"` unito a `overflow-x: auto` e `scrollbar-none`. In questo modo:
   - Se il contenuto entra nella cella, viene centrato esteticamente.
   - Se il contenuto supera la larghezza (es. 3+ banner), il bordo sinistro rimane accessibile senza traboccare sulle colonne adiacenti.
