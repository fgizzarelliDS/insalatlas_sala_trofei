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
  - `cartonato_desc` (🏷️ Banner Playout): Sconfitte ai playout accumulati.

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
| 🏷️　　| **Banner Cartonato (Playout)**     | **-2.00 pt**    | Retrocessione o sconfitta ai playout          |

---

## 2. Archivio Storico Stagioni & Coppe (Classifiche Tornei)

Il componente `src/components/board/seasonsArchive.ts` gestisce la consultazione storica dettagliata di tutte le edizioni di campionato, coppa e supercoppa disputate dalla lega:

- **Raggruppamento Cronologico**: Navigazione delle stagioni dalla fondazione (2015/16) all'edizione corrente (2024/25), con scomposizione per tipologia di torneo (Campionato, Coppa di Lega, Supercoppa).
- **Layout a 3 Colonne & Armonizzazione Mobile**:
  - Struttura tabellare responsive: colonna piazzamento (`Pos`), colonna club (`Squadra`) e colonna punteggio (`Punti`).
  - Ottimizzazione viewport compatti (360px–430px): larghezze flessibili (`w-14 sm:w-28` per la posizione, `w-14 sm:w-20` per i punti) e padding compatto (`px-1.5 sm:px-3`).
  - Badge di podio responsive: etichette abbreviate su schermi stretti (`🥇 1°`) che si espandono sui display desktop (`🥇 1° Scudetto`).
  - Tolleranza a nomi lunghi o composti: la colonna centrale del club adotta `min-w-0 flex-1 break-words`, consentendo il wrap del testo su più linee ed evitando l'attivazione di scroll orizzontale o il taglio della colonna punti fuori dallo schermo su dispositivi mobili.

---

## 3. Motore Stemmi Squadra & Fallback Vettoriale (`src/crests.ts`)

Il sistema assegna a ogni club uno stemma visivo distintivo senza ricorrere a segnaposto generici e senza dipendere da server esterni:

- **Risoluzione Gerarchica**:
  1. *Stemma Ufficiale Personalizzato*: Se il club ha uno stemma personalizzato (hashing DJB2) caricato nella lega, il motore carica il file PNG locale da `public/assets/teams/<hash>.png`.
  2. *Fallback Vettoriale Geometrico*: Se il club non dispone di stemma personalizzato o se il file non è reperibile, interviene il catalogo di fallback vettoriale, garantendo consistenza totale: la medesima squadra riceve deterministicamente lo stesso stemma in tutte le sezioni dell'app e tra diverse sessioni.
- **Catalogo 20 Stemmi Geometrici Vettoriali**:
  - Situati in `public/assets/crests/` (`crest-01.svg` ... `crest-20.svg`).
  - Progettati in grafica vettoriale pura con figure araldico-sportive (aquile, fenici, leoni, scudi geometrici, saette, ancore) rigorosamente prive di scritte o monogrammi testuali ("textless badges"), assicurando massima eleganza visiva e leggibilità a qualsiasi scala.
- **Piena Resilienza Offline**: Tutti gli stemmi risiedono localmente, eliminando qualsiasi dipendenza da CDN o endpoint esterni di terze parti.

---

## 4. Scheda Manager & Pipeline di Esportazione HD

Dalla modale di profilo di ogni fantallenatore (`src/components/modals/ProfileModal.ts` & `ProfileModalTemplate.ts`) è possibile consultare i dettagli completi di carriera:

- **Bump Chart Storica Decennale**: Visualizzazione interattiva dei piazzamenti ottenuti stagione per stagione (10 stagioni complessive). Le annate in cui il manager non ha preso parte alla competizione sono gestite esplicitamente come `N/D` con nodi visivi disconnessi per evitare distorsioni analitiche.
- **Squadre Utilizzate nel Tempo**: Mensola a pillole con aggregazione automatica degli intervalli cronologici consecutivi (es. `NomeClub (2016-2018)`), visualizzando il logo personalizzato o lo stemma vettoriale corrispondente.
- **Bacheca Trofei & Metriche di Carriera**: Tasso di conversione, piazzamenti podio, cucchiai di legno e banner personalizzati.

### Pipeline di Rendering Off-Screen

Per garantire un rendering perfetto senza flickering visivo o troncamenti dovuti allo scroll:

1. Il template della scheda viene clonato in un nodo isolato `#manager-profile-card-export-clone` posizionato fuori dal viewport (`fixed top-0 left-0 z-[-9999]`).
2. Vengono rimossi i controlli interattivi (pulsanti di chiusura, menu a tendina) e viene iniettato il footer editoriale ufficiale *InsalAtlas • Palmarès Ufficiale*.
3. `html2canvas` rasterizza la scheda a risoluzione 2.2× per una nitidezza broadcast.
4. L'immagine generata viene convertita in Blob PNG e gestita tramite:
   - **Download Diretto**: Salvataggio automatico del file `.png` sul dispositivo.
   - **Copia negli Appunti**: Utilizzo della Clipboard API nativa (`navigator.clipboard.write([new ClipboardItem(...)])`) per incollare istantaneamente l'immagine su WhatsApp Desktop, Telegram o Discord con `Cmd+V` / `Ctrl+V`.

---

## 5. Condivisione Social & Banter WhatsApp

L'applicazione integra un generatore di messaggi di condivisione (`src/export/share.ts`):

- **Messaggio Formattato**: Genera un testo arricchito con emoji, statistiche di carriera, bacheca trofei e l'archetipo comportamentale assegnato.
- **Deep Linking con Preview**: Include il link diretto `?manager=<id>` che apre automaticamente la modale del manager all'atterraggio grazie al modulo `src/router.ts`.

---

## 6. Modalità Modifica & Inline Editing

- Accesso protetto da password verificata via **SHA-256 Web Crypto API** (`src/config.ts`).
- Modifica contestuale in-place di tutti i titoli e intestazioni di colonna (`data-title-key`).
- Modale per l'aggiornamento dei record dei singoli manager, presenze, trofei e banner dei mister cartonati.
- Esportazione ed importazione di backup completi in formato JSON.

---

## 7. Progressive Web App (PWA) & Offline Layer

L'applicazione include il supporto PWA per l'installazione nativa su desktop e dispositivi mobili Android e iOS:

- **Manifest Web App** (`public/manifest.json`):
  - Configurazione standalone (`display: "standalone"`) per un'esperienza a tutto schermo priva di barre del browser.
  - Colori di sistema coerenti (`background_color: "#0f172a"`, `theme_color: "#0f172a"`).
  - Icone ad alta risoluzione con padding circolare safe-zone (`purpose: "any maskable"` a 512×512 e 192×192) per evitare ritagli antiestetici nei launcher di sistema.
- **Single Source of Truth per la Versione del Cache**:
  - La versione dell'applicazione (v1.1.0) è definita centralmente in `package.json`.
  - Il plugin personalizzato di build Vite inietta la versione nel Service Worker (`CACHE_NAME = 'insalatlas-v' + version`) e nel footer dell'applicazione.
  - Al rilascio di un aggiornamento, il Service Worker invalida automaticamente le cache obsolete e garantisce l'attivazione immediata delle nuove risorse.
- **Strategie di Caching**:
  - **Cache-First**: Asset statici essenziali (shell HTML, Tailwind, FontAwesome, icone, 20 stemmi SVG locali e bundle Vite).
  - **Stale-While-Revalidate**: Database `public/data.json`, servito istantaneamente offline o dalla cache e rivalidato asincronamente in background alla presenza di connettività.
  - **Banner di Installazione**: Riconoscimento dell'evento `beforeinstallprompt` con guida visuale per dispositivi iOS/Android ed engagement toast personalizzato.
