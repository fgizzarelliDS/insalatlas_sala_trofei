# Changelog • InsalAtlas Sala Trofei

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.
Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/) e aderisce al [Semantic Versioning](https://semver.org/lang/it/).

---

## [1.5.0] - 2026-10-15

### 🚀 Architettura League-Agnostic & Multi-Tenant Engine
* **Profilo di Lega Centralizzato (`src/config.ts`):** Astrazione completa del profilo lega (`LEAGUE`), con definizione dichiarativa di titoli, colonne del tabellone, storage prefix, regole di punteggio e feature flags dei tornei.
* **Tabellone Albo d'Oro Reattivo:** L'intestazione (`#albo-table-header`) e le righe del tabellone vengono composte dinamicamente a partire da `ALBO_COLUMNS`, sincronizzando la variabile CSS `--albo-cols` senza wrapper aggiuntivi né regressioni di allineamento.
* **Isolamento Multi-Tenant LocalStorage:** Tutte le chiavi di storage sono prefissate con `${LEAGUE.storagePrefix}_`, garantendo che istanze distinte (es. InsalAtlas e una seconda lega) ospitate sullo stesso dominio `github.io` non entrino in conflitto né sovrascrivano i dati utente.
* **Supporto Tornei a Disattivazione Totale:** Disattivando un torneo in `features` (es. `mundialito: false`), questo scompare coerentemente dall'Albo d'Oro, dalle card dell'Archivio Stagioni e dai contatori statistici in testata.
* **Pipeline Python Parametrizzata (`scripts/core/config.py`):** Estrazione e aggregazione dati pilotate dalle regole della lega (`LEAGUE_RULES`, `spoon_min_teams`, `excluded_manager_ids`). La compilazione di InsalAtlas resta al 100% byte-identical.
* **Guida Passo-Passo per Nuove Leghe:** Aggiunta documentazione operativa completa in [`specs/13-second-league-setup-guide.md`](specs/13-second-league-setup-guide.md) per setup, fork e sincronizzazione upstream con InsalAtlas.

### 🏆 Card Trofeo Interattive & Modali a Livelli
* **Nuovo Modale TrophyModal (`src/components/modals/trophy/`):** Cliccando sui contatori/trofei in testata (Scudetto, Coppa, Supercoppa, Mundialito, Cucchiaio, Cartonato) si apre l'Albo d'Oro specifico per competizione.
* **Bacheca Finali & Mini-Winner Card:** Visualizzazione dettagliata di tutte le edizioni concluse, finaliste, squadre vincitrici e bacheca podi.
* **Esportazione Grafica HD Dedicata:** Generazione e download in alta risoluzione dell'Albo d'Oro per ogni singolo trofeo (`exportTrophyRollHD`).
* **Layered Navigation:** Apertura sicura a livelli tra TrophyModal, ProfileModal e H2H senza sovrapposizioni visive né perdite di contesto.

### 🏅 Evoluzione Hall of Fame & Bacheca Record
* **Nuovi Primati Certificati:** Aggiunti record per *Grande Slam*, *Maledizione d'Argento*, *Re di Coppe*, *Drought Storica* e *Fedeltà di Lega* su 5 categorie storiche.
* **Navigazione Contestuale Dual-Target:** Cliccando sui riferimenti del record, l'utente può scegliere se aprire la scheda personale del manager o saltare direttamente alla classifica ufficiale della stagione nell'Archivio.
* **Ricerca Istantanea (`?q=`):** Filtro di ricerca in tempo reale per nome manager e categoria con deep-linking URL sincronizzato.
* **Condivisione Formattata WhatsApp:** Pulsante di condivisione rapida per singola card record con testo ottimizzato e link diretto.
* **Poster HD All-in-One:** Esportazione grafica completa dell'intera bacheca dei primati in un unico poster ad altissima risoluzione (`exportHallOfFamePosterHD`).

### 🧭 Navigazione, Deep-Linking & Home Routing
* **HTML5 History API Completa (`src/router.ts`):** Sincronizzazione bidirezionale tra URL e stato dell'interfaccia con supporto per tutti i parametri: `?tab=albo|seasons|records`, `?season=YYYY/YY`, `?manager=id`, `?h2h=idA:idB`, `?trophy=key` e `?q=query`.
* **Pulsante Home sul Logo:** Cliccando sul logo InsalAtlas in testata si torna istantaneamente all'Albo d'Oro principale ripulendo la URL dai parametri di contesto.
* **Navigazione Fluida Scheda Manager $\leftrightarrow$ H2H:** Banner contestuale "Torna alla Scheda Profilo di..." per rientrare agevolmente nel profilo di partenza dopo un confronto 1vs1.

### 📸 Motore di Export HD Modulare
* **Unificazione su `html-to-image`:** Sostituzione completa del precedente layer canvas con cattura nativa DOM a risoluzione 2.2× per una resa tipografica nitida e scalabile.
* **Architettura a Renderer Dedicati (`src/export/renderers/`):** Suddivisione modulare per target di rendering (`albo.ts`, `poster.ts`, `h2h.ts`, `profile.ts`, `record.ts`, `trophy.ts`).
* **Toolbar Esportazione Albo d'Oro:** Menu a discesa integrato con opzioni di download PNG ad alta definizione e copia istantanea negli appunti.

### 🛡️ Affidabilità & Offline PWA (Bug Fixes)
* **PWA Cache Strategy Network-First:** Nel Service Worker (`public/sw.js`), `data.json` viene ora servito con strategia Network-First salvando la risposta sotto la chiave normalizzata `./data.json` con `ignoreSearch: true`. Eliminato il cache bloat derivante dai parametri query timestamp (`?t=...`); garantiti dati sempre freschi online e persistenti offline.
* **Persistenza Competizioni Offline:** In `src/storage.ts`, salvataggio e caricamento in `localStorage` anche di `state.competitions`, rendendo l'Archivio Stagioni e i Record All-Time fruibili anche a connessione assente.
* **Ripristino Integrale Dati Ufficiali:** Unificata la logica di parsing in `applyLoadedData()`; il pulsante di reset ora ripristina integralmente manager, competizioni e titoli originali da `data.json`.
* **Note Metodologiche Dinamiche:** In `ChronologyTab.ts`, eliminate le stringhe statiche cablate a mano ("record 2022/23 ... 1.91", "2020/21 senza punti"): i testi guida vengono ora calcolati dinamicamente dalle metriche effettive della lega.
* **Rimozione Fallback Letterali di Stagione:** Eliminati i fallback rigidi a 10 stagioni fisse in `SparklineChart.ts` e `'2025/26'` in `chronology.ts`.
* **Testing Switch PWA Locale:** Aggiunto il parametro `?pwa=true` per consentire il collaudo del Service Worker anche su `localhost` senza inficiare il workflow di sviluppo.

### 🎨 Esperienza Utente, H2H & Mobile
* **Preservazione dello Scroll nel Modale H2H:** Cambiando la modalità grafica tra *Radar* e *Barre*, o espandendo la cronologia degli scontri diretti, la visuale del modale non salta più in cima ma rimane fissata sulla posizione corrente dell'utente.
* **Tabellino Annate H2H a 3 Colonne:** Rimossa la colonna ridondante "Esito" dal tabellino annate del duello 1vs1, offrendo maggiore larghezza e leggibilità ai nomi squadra su dispositivi mobili.
* **Visual Crests & Stemmi Storici:** Pulizia e normalizzazione degli stemmi vettoriali SVG e dei loghi squadra storici mancanti.
* **Tipizzazione TypeScript Strict:** Eliminati tutti i cast sciolti `as any` sullo stato delle annate e completata l'interfaccia `SeasonRecord.status`.

---

## [1.4.0] - 2026-10-12
* **Bacheca Record Iniziale:** Introduzione della prima versione della tab Record & Primati con 18 record e card visive.
* **Head-to-Head & Nemesis Matrix:** Modale 1vs1 per il confronto diretto tra manager, radar a 5 assi, barre duello e matrice incrociata delle rivalità.
* **Export Grafico Nativo:** Prima integrazione del motore di cattura grafica e condivisione su WhatsApp.

---

## [1.3.0] - 2026-10-09
* **Season Creation Modal:** Modale interattivo per la creazione e configurazione guidata delle stagioni.
* **Fantacalcio Ingestion Engine:** Parser e crawler per l'ingestione automatizzata da leghe.fantacalcio.it.
* **In-Progress Analytics:** Isolamento e gestione asintotica delle stagioni in corso e dei debuttanti.

---

## [1.2.0] - 2026-10-05
* **Dinamica Storica & Metodologia Compattezza:** Introduzione del calcolo del gradino medio (step gap) e normalizzazione delle annate a 8, 10 e 12 squadre.
* **Fasce di Rendimento Ponderate & Baricentro Storico:** Distribuzione in 4 fasce di carriera e indice di oscillazione $\sigma_R$.
* **Badge Unificati & Freddezza GCI:** Global Clutch Index e cold-bloodedness per finali e podi.

---

## [1.1.0] - 2026-10-02
* **Archivio Storico Stagioni:** Navigazione per annata con classifiche complete e tornei secondari.
* **Automated Versioning SSOT:** Propagazione automatica della versione da `package.json` a PWA e footer.
* **Vector Crest Engine:** Generatore e catalogo stemmi vettoriali SVG deterministici.

---

## [1.0.0] - 2026-09-30
* **Release Iniziale:** Albo d'oro decennale interattivo, modello econometrico di rating, trading card dei manager ed esportazione grafica.
