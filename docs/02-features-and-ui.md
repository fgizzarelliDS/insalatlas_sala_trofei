# 02 • Funzionalità & Interfaccia Utente

## 1. Tabella Palmarès Interattiva

La vista principale offre una bacheca dinamica ad alta leggibilità sportiva:

- **Ordinamento Dinamico Multi-Criterio**:
  - `trophies_desc` (🏆 Più Titolati): Trofei maggiori totali $\rightarrow$ Scudetti $\rightarrow$ Anzianità.
  - `rating_desc` (⭐ Rating Storico): Punteggio ponderato totale $\rightarrow$ Scudetti $\rightarrow$ Anzianità.
  - `scudetti_desc` (🥇 Più Scudetti): 1° posto campionato $\rightarrow$ 2° posti $\rightarrow$ Anzianità.
  - `years_desc` (📅 Anzianità): Stagioni disputate $\rightarrow$ Scudetti.
  - `mundialito_desc` (🌍 Mundialito): Titoli Mundialito vinti.
  - `spoons_desc` (🥄 Cucchiai di Legno): Ultimi posti collezionati.
  - `cartonato_desc` (📦 Banner Playout): Sconfitte ai playout accumulati.

- **Formula Ufficiale di Rating Storico**:

| Icona | Tipologia Trofeo / Riconoscimento  | Punti Assegnati | Descrizione                                   |
| :-----:| :-----------------------------------| :---------------:| :----------------------------------------------|
| 🥇　　| **1° Posto Campionato (Scudetto)** | **+3.00 pt**    | Campione d'Italia di Lega                     |
| 🏆　　| **Coppa di Lega (Oro)**            | **+2.00 pt**    | Vincitore della coppa a eliminazione diretta  |
| ⭐　　 | **Supercoppa di Lega**             | **+1.00 pt**    | Vincitore della sfida di apertura stagione    |
| 🌍　　| **Trofeo Mundialito**              | **+1.00 pt**    | Torneo speciale o competizione internazionale |
| 🥈　　| **2° Posto Campionato**            | **+0.50 pt**    | Vice-Campione della regular season            |
| 🥈　　| **Coppa di Lega (Argento)**        | **+0.25 pt**    | Finalista sconfitto in Coppa di Lega          |
| 🥉　　| **3° Posto Campionato**            | **+0.25 pt**    | Medaglia di bronzo della regular season       |
| 🥄　　| **Cucchiaio di Legno**             | **-1.00 pt**    | Ultimo classificato della regular season      |
| 📦　　| **Banner Cartonato (Playout)**     | **-2.00 pt**    | Retrocessione o sconfitta ai playout          |

---

## 2. Archivio Storico Stagioni, Coppe & Live Standings (Classifiche Tornei)

Il componente `src/components/board/seasonsArchive.ts` gestisce la consultazione storica dettagliata di tutte le edizioni di campionato, coppa e supercoppa disputate dalla lega, oltre alla visualizzazione in tempo reale della stagione in corso:

- **Raggruppamento Cronologico**: Navigazione delle stagioni dalla fondazione (2015/16) all'edizione corrente (2025/26), con scomposizione per tipologia di torneo (Campionato, Coppa di Lega, Supercoppa).
- **Layout a 3 Colonne & Armonizzazione Mobile**:
  - Struttura tabellare responsive: colonna piazzamento (`Pos`), colonna club (`Squadra`) e colonna punteggio (`Punti`).
  - Ottimizzazione viewport compatti (360px–430px): larghezze flessibili (`w-14 sm:w-28` per la posizione, `w-14 sm:w-20` per i punti) e padding compatto (`px-1.5 sm:px-3`).
  - Badge di podio responsive: etichette abbreviate su schermi stretti (`🥇 1°`) che si espandono sui display desktop (`🥇 1° Scudetto`).
  - Tolleranza a nomi lunghi o composti: la colonna centrale del club adotta `min-w-0 flex-1 break-words`, consentendo il wrap del testo su più linee ed evitando l'attivazione di scroll orizzontale o il taglio della colonna punti fuori dallo schermo su dispositivi mobili.
- **Integrazione Dinamica Elo nelle Classifiche Live (Reale & Merito)**:
  - Nelle viste della stagione in corso (*Classifica Reale* e *Classifica Merito*), il rating dinamico è integrato direttamente tramite un **pulsante toggle nell'intestazione di colonna** (`[⚡ Elo]`).
  - L'attivazione/disattivazione della colonna Elo preserva la compattezza visiva senza richiedere righe secondarie di controllo ridondanti e si adatta automaticamente ai layout mobile e desktop.

---

## 3. Hub Analitico & Dinamica Storica (Modale a 5 Tab)

L'hub econometrico e longitudinale (`src/components/modals/analytics/index.ts`) fornisce una suite completa di metriche competitive avanzate articolata su 5 sezioni:

- **Tab 1: Equilibrio & Macro**: Indici di Gini bivariati ($G_{\text{prestige}}$, $G_{\text{rating}}$), concentrazione $CR_3$, Herfindahl-Hirschman Index ($\text{HHI}$) ed entropia relativa ($H_{\text{rel}}$) con diagnosi qualitativa a 4 scenari.
- **Tab 2: Cinismo & Freddezza (Global Clutch Index)**:
  - *KPI Cards Riassuntive*: evidenziano il *Top GCI* (con titolo dinamico es. "Mister Più Cinico", nome, indice e record ori/finali) e i migliori specialisti della lega in Killer Instinct e Conversion Rate.
  - *Tabella Interattiva Ordinabile a 5 Colonne*: Manager, Podi ($PR\%$), Killer Instinct su scudetti vinti ($KI\%$), Conversion Rate nelle finali secche di coppa ($CR\%$) e l'**Indice GCI** sintetico con badge e colore di tier dedicato (visualizzazione a doppia riga con emoji e tier label sia su desktop che su mobile).
  - *Ordinamento Flessibile*: supporto all'ordinamento bidirezionale su GCI, Killer Instinct, Finals Conversion Rate, Podium Rate o nome alfabetico.
- **Tab 3: Archetipi Comportamentali**: Modello di coda (Feast-or-Famine bayesiano $\widetilde{FF}$, Net Tail Skew $NTS$ e Net Tail Index $NTI$) con classificazione deterministica a 9 archetipi.
- **Tab 4: Dinamica Storica & Cronologia**:
  - **Prospettiva Manager**:
    - *Piazzamento Medio Ponderato*: media dei piazzamenti finali sulle sole stagioni concluse, corredata da Best e Worst finish storici.
    - *Mini-Bar a 4 Fasce*: segmentazione visiva del tempo trascorso tra Vertice (🥇 1°-3°), Alta Classifica (⭐ Europa), Metà Classifica (⚖️) e Rischio Playout/Cucchiaio (🥄).
    - *Baricentro Storico*: punteggio sintetico da $1.0$ a $4.0$ con badge narrativo (*Élite Vertice*, *Alta Classifica*, *Metà Classifica*, *Zona Rischio*).
    - *Indice di Oscillazione (Volatilità)*: deviazione standard delle posizioni ($\sigma_{\text{rank}}$) per distinguere *Metronomi* ($\sigma < 2.0$), profili *Equilibrati* ($\sigma \le 3.5$), *Altalenanti* ($\sigma > 3.5$) ed *Esordienti*.
    - *Podi, Cucchiai & Serie Record*: conteggio podi, cucchiai di legno e strisce record consecutive di podio e salvezza.
    - *Filtri Contestuali*: selettore rapido tra **Tutti**, **Veterani (≥ 3 st.)** e **Attivi** (evidenziati con pallino verde di partecipazione alla stagione in corso).
    - *Supporto Debuttanti*: i manager con sola partecipazione attiva in corso vengono mostrati come `0 (debuttante)`, ricevono piazzamento medio neutrale (`—`) e badge `Debuttante`, posizionandosi in fondo alla graduatoria di piazzamento medio.
  - **Evoluzione Stagioni**:
    - Tabella storica di comparazione dell'equilibrio competitivo annuale: step gap (gradino medio pt/posizione), indice di compattezza normalizzato (0–100), forbice totale 1°-ultimo, volata podio (1°-3°) e playout thriller (penultimo-ultimo).
    - Verdetti stagionali con associazione nominale dei fantallenatori reali (non username tecnici).
    - *Esclusione Automatica Stagioni In Corso*: le competizioni con `in_progress: true` vengono filtrate per evitare anomalie con punteggi a zero e compattezza artificiale.
- **Tab 5: Elo Rating & Dinamica Forma**:
  - **Architettura a Doppia Traccia (Dual-Track Switcher)**:
    - *⚡ Elo Puro*: Calcolo standard da quota 1500 per tutti i team dal 2025/26 in avanti (efficienza pura sul campo).
    - *🏛️ Elo Storico*: Seeding iniziale differenziato basato sul Silverware Prestige Index (SPI) accumulato nei dieci anni precedenti.
  - **Traiettoria Multi-Squadra Interattiva (SVG)**:
    - Grafico vettoriale multi-linea con tracciamento temporale dell'Elo partita per partita.
    - Selettore stagionale (`Tutte`, `2026/27`, `2025/26`).
    - Toggle manager interattivo: click sul badge per accendere/spegnere la traccia del singolo club senza provocare salti di scroll della finestra.
    - Box dettagli interattivo con altezza dinamica protetta (`min-h-[44px]`): al passaggio del mouse o al tap sul singolo punto vengono visualizzati giornata, avversario, punteggio reale, esito (W/D/L), probabilità attesa pre-gara $P(\text{pre})$ e variazione $\Delta\text{Elo}$.
    - *Locking su Tap/Click*: Il click o tap sul punto blocca la selezione, nasconde in modo permanente l'invito a passare il mouse ed evidenzia il punto attivo con anello ad alto contrasto.
  - **Classifica Dinamica Elo Responsive**:
    - *Vista Desktop*: Tabella completa a 8 colonne (`Pos`, `Squadra`, `Mister`, `Elo Attuale`, `Δ Ultima G.`, `Picco Max`, `Minimo`, `Stagioni`) con ordinamento interattivo bidirezionale (ascendente/discendente) cliccando sull'intestazione di colonna.
    - *Vista Mobile*: Card compatte a sviluppo verticale ottimizzate per smartphone con pill-bar orizzontale di riordino rapido (`[# Pos] [⚡ Elo] [Δ Ultima] [Picco] [Minimo]`), badge di delta cromatici e zero troncamenti di testo.
  - **Guida Didattica Pieghevole**:
    - Pannello a scomparsa integrato contenente le formule logiche e matematiche (probabilità attesa $E_A$, formula di aggiornamento $\Delta = K \cdot (S - E)$, fattori $K=32$ per campionato e $K=24$ per coppe, e carryover inter-stagionale con regressione verso la media del 25%).

---

## 4. Motore Stemmi Squadra & Fallback Vettoriale (`src/crests.ts`)

Il sistema assegna a ogni club uno stemma visivo distintivo senza ricorrere a segnaposto generici e senza dipendere da server esterni:

- **Risoluzione Gerarchica**:
  1. *Stemma Ufficiale Personalizzato*: Se il club ha uno stemma personalizzato (hashing DJB2) caricato nella lega, il motore carica il file PNG locale da `public/assets/teams/<hash>.png`.
  2. *Fallback Vettoriale Geometrico*: Se il club non dispone di stemma personalizzato o se il file non è reperibile, interviene il catalogo di fallback vettoriale, garantendo consistenza totale: la medesima squadra riceve deterministicamente lo stesso stemma in tutte le sezioni dell'app e tra diverse sessioni.
- **Catalogo 20 Stemmi Geometrici Vettoriali**:
  - Situati in `public/assets/crests/` (`crest-01.svg` ... `crest-20.svg`).
  - Progettati in grafica vettoriale pura con figure araldico-sportive (aquile, fenici, leoni, scudi geometrici, saette, ancore) rigorosamente prive di scritte o monogrammi testuali ("textless badges"), assicurando massima eleganza visiva e leggibilità a qualsiasi scala.
- **Piena Resilienza Offline**: Tutti gli stemmi risiedono localmente, eliminando qualsiasi dipendenza da CDN o endpoint esterni di terze parti.

---

## 5. Scheda Manager & Pipeline di Esportazione HD

Dalla modale di profilo di ogni fantallenatore (`src/components/modals/ProfileModal.ts` & `ProfileModalTemplate.ts`) è possibile consultare i dettagli completi di carriera:

- **Bump Chart Storica Decennale**: Visualizzazione interattiva dei piazzamenti ottenuti stagione per stagione (10 stagioni complessive). Le annate in cui il manager non ha preso parte alla competizione sono gestite esplicitamente come `N/D` con nodi visivi disconnessi per evitare distorsioni analitiche.
- **Traiettoria Elo (Forma Dinamica & Match-by-Match)**:
  - Sparkline interattiva della serie storica Elo della squadra del manager nel tab Piazzamenti/Carriera.
  - Selettore stagionale dedicato (`all`, `2026/27`, `2025/26`) per isolare singoli campionati o analizzare la continuità pluriennale.
  - Hover & tap details box responsive: avversario, punteggio reale, esito (W/D/L), probabilità attesa pre-gara $P(\text{pre})$ e variazione $\Delta\text{Elo}$.
  - Target di tocco touch-friendly maggiorati (`r=12`), locking su click con rimozione permanente dell'invito testuale ed evidenziazione ad anello del match selezionato.
- **Squadre Utilizzate nel Tempo**: Mensola a pillole con aggregazione automatica degli intervalli cronologici consecutivi (es. `NomeClub (2016-2018)`), visualizzando il logo personalizzato o lo stemma vettoriale corrispondente.
- **Bacheca Trofei & Metriche di Carriera**: Tasso di conversione, piazzamenti podio, cucchiai di legno e banner personalizzati.
- **Badge Analitici Unificati (4 Dimensioni)**:
  - `Profilo: <Archetipo>` (waterfall a 9 priorità comportamentali).
  - `Rischio: <Polarità NTI>` (polarità asimmetrica di coda).
  - `Stabilità: <Categoria>` (dispersione posizionale $\sigma_R$).
  - `Freddezza: <Tier>` (Global Clutch Index $GCI$ con neutralità debuttanti: *Glaciale*, *Cinico*, *Equilibrato*, *Incerto*, *Choker*, *Debuttante*).
- **Trading Card HD 9:16**: Rendering ibrido automatico FontAwesome + emoji Unicode per una resa perfetta dei badge analitici e onorari su card collezionabile ad alta risoluzione.

### Pipeline di Rendering Off-Screen

Per garantire un rendering perfetto senza flickering visivo o troncamenti dovuti allo scroll:

1. Il template della scheda viene clonato in un nodo isolato `#manager-profile-card-export-clone` posizionato fuori dal viewport (`fixed top-0 left-0 z-[-9999]`).
2. Vengono rimossi i controlli interattivi (pulsanti di chiusura, menu a tendina) e viene iniettato il footer editoriale ufficiale *InsalAtlas • Palmarès Ufficiale*.
3. `html-to-image` rasterizza la scheda a risoluzione 2.2× per una nitidezza broadcast.
4. L'immagine generata viene convertita in Blob PNG e gestita tramite:
   - **Download Diretto**: Salvataggio automatico del file `.png` sul dispositivo.
   - **Copia negli Appunti**: Utilizzo della Clipboard API nativa (`navigator.clipboard.write([new ClipboardItem(...)])`) per incollare istantaneamente l'immagine su WhatsApp Desktop, Telegram o Discord con `Cmd+V` / `Ctrl+V`.

---

## 6. Condivisione Social & Banter WhatsApp

L'applicazione integra un generatore di messaggi di condivisione (`src/export/share.ts`):

- **Messaggio Formattato**: Genera un testo arricchito con emoji, statistiche di carriera, rating storico, bacheca trofei, l'archetipo comportamentale e il livello di Freddezza (`🏹 *Freddezza:* Cinico`).
- **Deep Linking con Preview**: Include il link diretto `?manager=<id>` che apre automaticamente la modale del manager all'atterraggio grazie al modulo `src/router.ts`.

---

## 7. Modulo di Confronto Diretto Head-to-Head (H2H), Tavolo dei Rivali & Matrice Nemesi

L'applicazione include un hub completo per lo studio delle rivalità storiche (`src/components/modals/h2h/` & `src/analytics/headToHead.ts`), articolato su 3 viste principali:

### 7.1 Duello Testa a Testa 1vs1
- **Punti di Accesso Integrati**:
  - Pulsante `[⚔️ H2H]` nella Top Toolbar principale della schermata iniziale.
  - Pulsante `[⚔️ Confronta]` all'interno della Scheda Profilo (`ProfileModal`), che pre-seleziona istantaneamente il manager corrente come Contendente A.
- **Scoreboard Scontri Diretti in Campionato**:
  - Conteggio delle stagioni disputate insieme escludendo le annate in corso.
  - Box a tre indicatori (*Vittorie A, Pareggi, Vittorie B*) con barra proporzionale tricolore.
  - Tabellino cronologico espandibile annata per annata con squadra utilizzata, piazzamento A vs piazzamento B ed esito del confronto.
- **Bacheca Trofei a Specchio**:
  - Confronto diretto su Scudetti, Coppe di Lega, Supercoppe, Mundialito, Totale Titoli Major, Secondi/Terzi Posti, Cucchiai, Cartonati e Rating Storico con evidenziazione del leader.
- **Doppia Visualizzazione Comparativa (Dual-Mode: Radar vs Barre)**:
  - **Radar - 6 Assi**: calcolo vettoriale puro a 6 dimensioni (*Prestigio*, *Freddezza GCI*, *Killer Instinct*, *Conversione Coppe*, *Stabilità*, *Sicurezza Anti-Baratro*) scalate e normalizzate in $[0, 100]$ con poligoni semi-trasparenti per Mister A e Mister B.
  - **Barre Orizzontali Comparative (Stile Duello)**: barre contrapposte a specchio che si espandono dal centro con valori numerici e corona di vittoria per l'attributo migliore.
  - **Toggle Switcher Integrato**: selettore compatto `[🕸️ Radar]` / `[📊 Barre]` per alternare istantaneamente le due modalità visive.
- **Verdetto Narrativo Automatico**:
  - Algoritmo che analizza l'esito degli scontri diretti e i differenziali di cinismo generando una diagnosi sintetica della rivalità sportiva.

### 7.2 Tavolo dei Rivali (Multi-Manager fino a 6 Contendenti)
- **Selezione Multipla Flessibile**: Confronto simultaneo da 3 a **6 manager**, identificati da una palette cromaticamente distinta a 6 colori (Ambra, Ciano, Rosa, Smeraldo, Viola, Blu).
- **Multi-Radar Sovrapposto a 6 Assi**: Tracciamento simultaneo di tutti i manager selezionati sullo stesso grafico radar a 6 dimensioni.
- **Mini-Torneo Incrociato**: Classifica interna al gruppo dei rivali con switch `[Solo Contemporanee]` (calcolo rigoroso sulle sole annate in cui tutti i selezionati erano presenti) e `[Tutte le Stagioni (PPG)]` (normalizzazione per punti a partita).
- **Tabella di Confronto Carriera a Colonne Parallele**: Prospetto dettagliato metrica per metrica con:
  - *Mobile*: Colonna fissa `Metrica` con sfondo opaco solido (`var(--modal-bg)`) per evitare ghosting e larghezza compattata per visualizzare almeno 2 manager affiancati senza troncamenti.
  - *Desktop*: Disattivazione dello sticky (`md:static`, `md:table-fixed`) per una fruizione fluida con zero barre di scorrimento orizzontale.

### 7.3 Matrice Nemesi N×N
- Griglia bidimensionale di tutte le rivalità della lega che mappa istantaneamente la *Bestia Nera* e la *Vittima Preferita* di ciascun allenatore con filtri per confidenza e stagioni condivise.

### 7.4 Esportazione HD e Social Story 9:16
- **Scheda Grafica Panoramica (HD)**: Salvataggio PNG via `html-to-image`.
- **Social Story 9:16 (1080×1920)**: Pulsante `Story (9:16)` per esportare una card verticale pronta per Instagram e WhatsApp, completa di safe-zone, radar ad alta leggibilità e tabellino.
- **Deep Linking**: Parametro URL bidirezionale `?h2h=idA:idB` per condividere direttamente i duelli.

---

## 8. Hall of Fame — Bacheca Record & Primati Storici

- **Tab Principale Dedicato**: Navigazione contestuale integrata nella schermata primaria (*Albo d'Oro*, *Stagioni*, *Record & Primati*, *Dinamica Storica*).
- **28 Record Certificati su 5 Categorie Storiche**:
  - **Punti & Podi**: Record assoluti di punteggio stagionale, minima quota salvezza/scudetto, miglior e peggior media gara (`pt/g`), e **Miglior Rendimento da Matricola** (`debut_best_ppg`).
  - **Dominio & Coppe**: Massimo e minimo distacco scudetto, volata podio serrata, multi-trofeo solare (*Triplete*), re dei campionati, signore delle coppe, abbonato al podio, *L’Imbattibile (Back-to-Back Scudetti)*, e **Miglior Piazzamento da Matricola** (`debut_best_rank`).
  - **Rivalità Head-to-Head**: Vittime preferite, bestie nere storiche e duelli scudetto di cartello.
  - **Strisce & Fedeltà**: Continuità a podio, fedeltà e presenze all-time, e *La Grande Rimonta (Scalata Stagionale)* (+10 posizioni).
  - **Disonori & Curiosità**: Mister Camaleonte, cucchiai di legno, eterni secondi (campionato e coppe), re del cartonato, *Il Crollo del Campione (Flop Post-Scudetto)*, *Il Purgatorio della Serie Atlas* (stagioni senza scudetto), e **Debutto da Incubo: Cucchiaio / Cartonato** (`debut_disaster`).
- **Navigazione Contestuale Dual-Target**:
  - **Click sul Box o Badge Stagione (`[📅 YYYY/YY ➔]`)**: Naviga istantaneamente alla classifica ufficiale di quella specifica annata nell'Archivio Stagioni con smooth scroll ed effetto pulse dorato sulla riga del primatista.
  - **Click sul Nome/Avatar del Manager**: Apre la scheda profilo del fantallenatore con palmarès completo, archetipo e statistiche.
- **Normalizzazione Storica**: Ponderazione su base media partita (`pt/g`) per armonizzare campionati storici disputati su 33, 35 e 36 giornate.
- **Card Vettoriali con Stemmi d'Epoca & Filigrane**: Ogni record espone il valore primato, il primatista (o co-primatisti ex-aequo), piazzamenti d'onore e filigrana grafica tematica.
- **Esportazione Multi-Formato**:
  - **Poster Celebrativo All-in-One HD**: Esportazione grafica panoramica a 1400px con griglia per tutte le 5 categorie.
  - **Social Story Singolo Record (9:16)**: Scheda verticale 1080×1920 con stemma primatista gigante, valore mono in stile sportivo e box *Podio Storico* arricchito con stemmi club, medaglie (🥈/🥉), nome squadra in corsivo, punteggi e annate.
  - **Story Top Primati (Poster Riassuntivo 9:16)**: Sintesi grafica verticale dei 6 primati più prestigiosi della lega.


---

## 9. Modalità Modifica & Inline Editing

- Accesso protetto da password verificata via **SHA-256 Web Crypto API** (`src/config.ts`).
- Modifica contestuale in-place di tutti i titoli e intestazioni di colonna (`data-title-key`).
- Modale per l'aggiornamento dei record dei singoli manager, presenze, trofei e banner dei mister cartonati.
- Esportazione ed importazione di backup completi in formato JSON.

---

## 10. Progressive Web App (PWA) & Offline Layer

L'applicazione include il supporto PWA per l'installazione nativa su desktop e dispositivi mobili Android e iOS:

- **Manifest Web App** (`public/manifest.json`):
  - Configurazione standalone (`display: "standalone"`) per un'esperienza a tutto schermo priva di barre del browser.
  - Colori di sistema coerenti (`background_color: "#0f172a"`, `theme_color: "#0f172a"`).
  - Icone ad alta risoluzione con padding circolare safe-zone (`purpose: "any maskable"` a 512×512 e 192×192) per evitare ritagli antiestetici nei launcher di sistema.
- **Single Source of Truth per la Versione del Cache**:
  - La versione dell'applicazione è definita centralmente in `package.json`.
  - Il plugin personalizzato di build Vite inietta la versione nel Service Worker (`CACHE_NAME = 'insalatlas-v' + version`) e nel footer dell'applicazione.
  - Al rilascio di un aggiornamento, il Service Worker invalida automaticamente le cache obsolete e garantisce l'attivazione immediata delle nuove risorse.
- **Strategie di Caching**:
  - **Cache-First**: Asset statici essenziali (shell HTML, Tailwind, FontAwesome, icone, 20 stemmi SVG locali e bundle Vite).
  - **Network-First**: Database `public/data.json`, servito con priorità di rete per garantire dati costantemente aggiornati, con fallback deterministico dalla cache locale offline (e chiave normalizzata anti-bloat).
  - **Banner di Installazione**: Riconoscimento dell'evento `beforeinstallprompt` con guida visuale per dispositivi iOS/Android ed engagement toast personalizzato.

---

## 11. Stagione In Corso & Live Analytics

Per le stagioni contrassegnate come `in_progress: true`, il sistema attiva un motore live dedicato:

1. **Top Cards Riassuntive a Riga Singola (6 Card)**:
   - Griglia responsive desktop su un'unica riga (`lg:grid-cols-6`):
     - `📅 STAGIONI` (Totale e indicatore stagione in corso)
     - `🥇 SCUDETTI`
     - `🏆 COPPE & SUPERCOPPE` (Accorpamento dinamico Coppa + Supercoppa)
     - `🌍 MUNDIALITO`
     - `🥄 CUCCHIAI LEGNO`
     - `📦 BANNER CARTONATO`
2. **Classifica Live In Corso (Configurazione Attiva)**:
   - **Desktop (>= 768px)**: 4 colonne essenziali:
     - `Pos`: Posizionamento ufficiale in classifica.
     - `Squadra / Allenatore`: Nome club e manager con stemma ufficiale ad alta definizione.
     - `Forma (L5)`: Pallini compatti colorati 🟢 (Vittoria), 🟡 (Pareggio), 🔴 (Sconfitta).
     - `Stato`: Badge qualitativo di momento (`🔥 IN FIAMME`, `📈 IN ASCESA`, `⚖️ STABILE`, `📉 IN FLESSIONE`, `🧊 CRISI NERA`) con etichetta estesa visibile sia su desktop che su mobile.
    - **Mobile (< 768px)**: Card compatte touch-friendly con `#Pos`, club, mister, badge di stato ed espansione sub-dettaglio per i pallini L5.
3. **Selettore a 2 Viste & Guida Dinamica Integrati nell'Header (`standingsTable.ts`)**:
   - Direttamente nell'header box della tabella (la fascia con il colore del tema) è integrato lo switch segmentato a 2 viste in stile dark glass (`bg-black/25 backdrop-blur-xs border-white/15`):
     - `[ Classifica Reale ]`: visualizzazione a 4 colonne focalizzata sulla corsa campionato (Pos, Squadra, Forma L5, Stato).
     - `[ Merito & Fortuna (xPTS) ]`: visualizzazione analitica scientifica che misura la distorsione del calendario.
     - Su desktop (>= sm) lo switch si trova sulla stessa riga dopo la dicitura `In corso`; su mobile (< sm) occupa ordinatamente una seconda riga a tutta larghezza (50/50).
   - **Pulsante Guida Dinamica `[ℹ️ Guida & Legenda ▾]`**:
     - Posizionato a destra nell'header in stile glass, apre a fisarmonica la guida contestuale direttamente sopra la tabella.
     - In *Classifica Reale*: illustra il Momentum L5 e la matrice dei 5 badge di Stato.
     - In *Merito & Fortuna*: illustra il calcolo dei punti attesi $x\text{PTS}$ (matrice 1 vs Tutti a soglie gol), il delta di fortuna $\Delta\text{Pt}$, e i 5 badge di fortuna del Z-Score Monte Carlo (`🍀`, `↗️`, `⚖️`, `↘️`, `⛈️`).
4. **Colonne della Classifica Merito & Fortuna**:
   - **Pos. xPTS**: Piazzamento di merito con pillola comparativa minimalista rispetto alla posizione reale (es. `▲ +3 (R:#4)`, `▼ -2 (R:#1)`, `= 0`).
   - **Squadra & Allenatore**: Stemma, nome club e mister, interattivi per aprire il tabellino gare.
   - **Punti Attesi ($x\text{PTS}$)**: Punti meritati su base 3 punti partita, con pillola $\Delta\text{Pt} = \text{Punti Reali} - x\text{PTS}$ (verde se favorito dal calendario, rosso se sfortunato).
   - **Record Tutti vs Tutti**: Risultati cumulativi affrontando tutti gli altri 13 manager ogni giornata (es. `11V 1N 1P`) e percentuale vittorie.
   - **Indice Fortuna Z-Score**: Badge con emoji, etichetta e deviazione standard $\mathcal{L}_z$ calcolata su 10.000 calendari alternativi.
   - **Scenari Monte Carlo**: Percentuali di Podio % e Cucchiaio % (attivate a partire dalla 5ª giornata disputata per garantire solidità statistica).
5. **Tabellino Partite Minimalista (`TeamMatchesModal.ts`)**:
   - **Layout Essenziale**: Badge giornata in grassetto su singola riga (`G1`, `G2`...), stemma squadra e denominazione avversario affiancati orizzontalmente. Rimossi data, nome mister e pill CASA/TRASFERTA per massima pulizia visiva.
   - **Mascheramento Punteggi & Esiti**: Mostra unicamente badge qualitativi (`VITTORIA` 🟢, `PAREGGIO` 🟡, `SCONFITTA` 🔴). Gli incontri non ancora disputati (in programma) riportano un pulito indicatore **`-`** privo di esito forzato.
   - **Navigazione Contestuale tra Avversari**: Cliccando su qualsiasi squadra avversaria, il modale carica istantaneamente il calendario del club cliccato, esponendo un pulsante circolare `[←]` nell'header per ripercorrere a ritroso la cronologia di navigazione.

