# 03 • Econometria, Cinismo & Modelli di Rischio

Il modulo analitico `src/analytics/` (`econometrics.ts`, `tailRisk.ts`, `archetypes.ts`, esposto tramite `index.ts`) opera sui dati aggregati di carriera presenti in `public/data.json`. Si articola in tre pilastri analitici.

---

## 1. Pilastro I: Silverware Prestige Index & Macro-Parità

### 1.1 Silverware Prestige Index (SPI)

Per evitare che una Supercoppa vinta in gara secca abbia lo stesso peso di uno Scudetto conquistato su 38 giornate, ogni titolo è ponderato per difficoltà strutturale:

| Competizione | Parametro | Peso ($w$) | Ratio Analitica |
| :--- | :--- | :---: | :--- |
| **Scudetto** | `gold` | **3.00** | Maratona a girone unico su 38 giornate. |
| **Coppa di Lega** | `cup_gold` | **1.50** | Torneo a eliminazione diretta su più turni. |
| **Supercoppa** | `supercup` | **0.75** | Finale secca tra campioni in carica. |
| **Mundialito** | `mundialito` | **0.50** | Competizione preliminare / mini-torneo. |

$$\text{Prestige Points}_i = 3.0 \cdot \text{Gold}_i + 1.5 \cdot \text{CupGold}_i + 0.75 \cdot \text{Supercup}_i + 0.50 \cdot \text{Mundialito}_i$$

$$\text{Prestige Share } s_i = \left( \frac{\text{Prestige Points}_i}{\sum_{j=1}^n \text{Prestige Points}_j} \right) \times 100$$

---

### 1.2 Coefficiente di Gini Bivariato ($G_{\text{prestige}}$ vs $G_{\text{rating}}$)

- **Gini Prestigio ($G_{\text{prestige}}$)**: Misura la disuguaglianza nella conquista dei trofei pesanti ordinati in modo non decrescente ($P_{(1)} \le P_{(2)} \le \dots \le P_{(n)}$):
  $$G_{\text{prestige}} = \frac{2 \sum_{i=1}^{n} i \cdot P_{(i)}}{n \sum_{i=1}^{n} P_{(i)}} - \frac{n + 1}{n}$$
- **Gini Rating ($G_{\text{rating}}$)**: Calcolato sul punteggio storico complessivo traslato nel dominio non negativo ($R'_i = R_i - \min(0, \min R)$), misura l'equilibrio complessivo includendo piazzamenti e penalità playout.

---

### 1.3 Top-3 Concentration ($CR_3$), Indice HHI & Entropia ($H_{\text{rel}}$)

- **Top-3 Concentration Ratio**:
  $$CR_3^{\text{prestige}} = \left( \frac{\sum_{k=1}^3 P_{(\text{top } k)}}{\sum_{j=1}^n P_j} \right) \times 100$$
- **Herfindahl-Hirschman Index (HHI)**:
  $$\text{HHI} = \sum_{i=1}^n s_i^2 = \sum_{i=1}^n \left(\frac{P_i}{\sum P} \times 100\right)^2$$
- **Normalized Relative Entropy**:
  $$H_{\text{rel}} = \frac{-\sum_{i=1, P_i > 0}^n p_i \ln(p_i)}{\ln(n)}$$
  Un valore di $H_{\text{rel}} = 1.0$ indica perfetta parità distributiva; valori tendenti a $0.0$ segnalano monopolio assoluto.

---

### 1.4 Calibrazione per Piccoli Gruppi & Diagnosi Narrativa

Nei campionati di Fantacalcio ($N = 8 \dots 14$), il solo indice di Gini teorico tende a sovrastimare la disuguaglianza per la presenza naturale di squadre a quota zero titoli. Per questo, l'algoritmo di diagnosi qualitativa di lega valuta congiuntamente **$G_{\text{prestige}}$**, **$CR_3^{\text{prestige}}$** e **$\text{HHI}_{\text{prestige}}$** secondo una sequenza decisionale rigorosa:

| Priorità | Stato / Diagnosi di Lega | Icona | Colore UI | Condizione Logica Multi-Indice | Diagnosi Narrativa & Dinamica di Lega |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **#1** | **Far West (Parità Assoluta)** | 🤠 | 🟢 Verde (`#10b981`) | $(G_{\text{prestige}} \le 0.40)$ **AND** $(CR_3 \le 45\%)$ **AND** $(\text{HHI} < 1400)$ | Campionato anarchico ed imprevedibile: il potere è frammentato, elevata alternanza annuale al vertice e rotazione continua dei campioni. |
| **#2** | **Feudalesimo Assoluto** | 🏰 | 🔴 Rosso (`#ef4444`) | $((G_{\text{prestige}} > 0.75)$ **AND** $(CR_3 \ge 72\%))$ **OR** $(\text{HHI} \ge 2500)$ | Monopolio dinastico stile Bayern/PSG: 1 o 2 squadre accentrano quasi tutti i titoli pesanti, soffocando ogni ricambio al vertice. |
| **#3** | **Lega a Tre Velocità** | ⚖️ | 🟡 Ambra (`#f59e0b`) | $(G_{\text{prestige}} > 0.55)$ **OR** $(CR_3 \ge 58\%)$ **OR** $(\text{HHI} \ge 1800)$ | Oligarchia storica consolidata: una cerchia ristretta di 3 o 4 potenze storiche domina la bacheca, lasciando alle altre squadre solo le briciole. |
| **#4** | **Competizione Aperta** | ⚽ | 🔵 Blu (`#3b82f6`) | *Fallback predefinito (nessun estremo soddisfatto)* | Alternanza equilibrata e fisiologica: classe media viva e competitiva, rotazione sana tra i vincitori e contesa aperta su ogni fronte. |

> [!NOTE]
>
> - **$G_{\text{prestige}}$**: Coefficiente di Gini ponderato per la difficoltà dei titoli conquistati ($[0.0, 1.0]$).
> - **$CR_3^{\text{prestige}}$**: Quota percentuale di prestigio detenuta dai primi 3 manager della lega ($[0\%, 100\%]$).
> - **$\text{HHI}_{\text{prestige}}$**: Herfindahl-Hirschman Index sommato sulle quote percentuali di prestigio ($\sum s_i^2$, $[0, 10000]$).

---

## 2. Pilastro II: Dinamiche di Podio & Cinismo

### 2.1 Presenza a Podio ($PR$) & Killer Instinct ($KI$)

- **Podium Rate ($PR_i$)**: Frequenza di posizionamento sul podio campionato (1°, 2°, 3° posto):
  $$PR_i = \left(\frac{\text{Gold}_i + \text{Silver}_i + \text{Bronze}_i}{\text{Years}_i}\right) \times 100$$
- **Killer Instinct ($KI_i$)**: Capacità di convertire una presenza sul podio nella conquista dello Scudetto:
  $$KI_i = \left(\frac{\text{Gold}_i}{\text{Gold}_i + \text{Silver}_i + \text{Bronze}_i}\right) \times 100$$

### 2.2 Finals Conversion Rate (Clutch vs. Bottler nelle Coppe)

Misura la percentuale di successo nelle **finali secche a eliminazione diretta** (Coppa di Lega e Supercoppa):
$$\text{Conversion Rate}_i = \left(\frac{\text{CupGold}_i + \text{Supercup}_i}{\text{CupGold}_i + \text{Supercup}_i + \text{CupSilver}_i + \text{SupercupSilver}_i}\right) \times 100$$

> [!NOTE]
>
> - **Separazione Ortogonale tra Campionato e Coppe**: Lo Scudetto è governato dal **Killer Instinct ($KI\%$)**, che misura la maratona a tappe del campionato (capacità di convertire i podi in trionfi). Il **Conversion Rate ($CR\%$)** è invece strettamente riservato alle **finali secche da dentro o fuori**: misura la freddezza nei 90 minuti quando c'è una coppa in palio.
> - **Accesso alla Supercoppa**: Si qualificano alla finale annuale il vincitore dello Scudetto ($\text{Gold}$) e il vincitore della Coppa di Lega ($\text{CupGold}$) di ciascuna stagione (competizione introdotta a partire dalla 4ª edizione della lega). Chi vince conquista la Supercoppa ($\text{Supercup}$), chi viene sconfitto registra una finale persa ($\text{SupercupSilver}$).
> - **Mundialito**: Verrà integrato nel computo del cinismo non appena sarà formalizzato lo storico completo dei 3 sconfitti in finale delle rispettive edizioni.

---

## 3. Pilastro III: Tail-Risk Modeling & Archetipi Comportamentali

### 3.1 Pesi di Coda Asimmetrici & Masse Estreme

La volatilità di rendimento viene modellata separando i trionfi dalle catastrofi sportive:
$$\text{FeastMass}_i = 1.0 \cdot \text{Gold}_i + 0.5 \cdot \text{CupGold}_i$$
$$\text{DisasterMass}_i = 1.0 \cdot \text{Spoon}_i + 0.75 \cdot \text{Cartonato}_i$$
$$\text{TotalTailMass}_i = \text{FeastMass}_i + \text{DisasterMass}_i$$

### 3.2 Feast-or-Famine con Shrinkage Bayesiano ($\widetilde{FF}$)

Per evitare distorsioni da piccolo campione su manager con poche stagioni all'attivo, il rapporto include un prior empirico di lega ($K = 2.0$, $\bar{FF} = 0.30$):
$$\widetilde{FF}_i = \frac{\text{TotalTailMass}_i + (K \cdot \bar{FF})}{\text{Years}_i + K}$$

### 3.3 Net Tail Skew ($NTS$) Regolarizzato

Determina se la volatilità pende verso il trionfo o verso la disfatta con fattore di regolarizzazione ($M = 1.5$):
$$NTS_i = \begin{cases} 0 & \text{se } \text{TotalTailMass}_i = 0 \\ \frac{\text{FeastMass}_i - \text{DisasterMass}_i}{\text{TotalTailMass}_i + M} & \text{altrimenti} \end{cases} \quad \in [-1.0, +1.0]$$

### 3.4 Net Tail Index ($NTI$)

Sintetizza magnitudo e polarità direzionale in un unico scalare:
$$NTI_i = \widetilde{FF}_i \times NTS_i \in [-1.0, +1.0]$$

| Range NTI | Polarità Comportamentale | Icona | Colore UI |
| :---: | :--- | :---: | :---: |
| **$\ge +0.30$** | **Cannibale Assoluto**: Rischio mirato costantemente alla vittoria finale. | ⚡ | 🟢 Smeraldo (`#10b981`) |
| **$+0.08 \dots +0.29$** | **Attaccante Efficace**: Raccoglie stabilmente più trionfi che disastri. | 🎯 | 🟢 Verde Menta (`#34d399`) |
| **$-0.07 \dots +0.07$** | **Neutro / Bilanciato**: Profilo bilanciato a centro classifica. | ⚖️ | ⚪ Ardesia Neutro (`#94a3b8`) |
| **$-0.29 \dots -0.08$** | **Vulnerabile**: Frequenti difficoltà e presenze nelle zone basse. | 🛡️ | 🟡 Ambra (`#f59e0b`) |
| **$\le -0.30$** | **Bersaglio Mobile**: Elevata instabilità con crolli sistematici ai playout. | 🎯 | 🔴 Rosso Fuoco (`#ef4444`) |

---

## 4. Waterfall degli Archetipi Primari

A ogni manager viene assegnato un solo archetipo comportamentale primario. La classificazione segue un algoritmo **waterfall a priorità deterministica**: la prima condizione soddisfatta dall'alto verso il basso assegna in via esclusiva il badge e la descrizione del profilo.

| Priorità | Archetipo & Badge | Icona | Colore UI | Condizione Logica di Assegnazione | Profilo Narrativo & Banter |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **#1** | **Dominatore Dinastico** | 👑 | 🟡 Oro Ambra (`#eab308`) | $(P \ge 10.0$ **AND** $(P_{\text{eff}} \ge 0.50$ **OR** $\text{Eff} \ge 0.40))$ **OR** $(\text{Gold} \ge 2$ **AND** $P \ge 7.00)$ | Egemonia storica consolidata; bacheca ricca di trofei pesanti con eccellente continuità e pedigree vincente. |
| **#2** | **Vittima Sacrificale** | ☠️ | 🔴 Rosso (`#ef4444`) | $\text{Disonori} \ge 3$ **OR** $(\text{Disonori} \ge 2$ **AND** $\text{Trofei} = 0)$ | Bersaglio designato delle rivali; colleziona cucchiai e cartonati ai playout con bacheca trofei deserta. |
| **#3** | **Cannibale del Podio** | 🏆 | 🟠 Oro Intenso (`#f59e0b`) | $PR \ge 50\%$ **AND** $KI \ge 60\%$ **AND** $\text{Podi} \ge 2$ | Quando arriva in zona medaglie difficilmente si accontenta: converte sistematicamente il podio in trionfo. |
| **#4** | **Cinico Chirurgico** | 🎯 | 🟢 Smeraldo (`#10b981`) | $\text{Finali} \ge 2$ **AND** $\text{Conversion Rate} \ge 70\%$ | Letale nelle finali secche; straordinaria freddezza sotto pressione negli atti conclusivi di coppa e campionato. |
| **#5** | **Il Grande Piazzato** | ⭐ | 🟠 Ambra Scuro (`#d97706`) | $\text{Podi} \ge 3$ **AND** $KI \le 25\%$ | Sempre presente nelle zone nobili della classifica, ma soffre di un cronico blocco psicologico all'ultimo chilometro. |
| **#6** | **Eterno Secondo** | 🥈 | 🟣 Indaco (`#6366f1`) | $(\text{Silver} + \text{CupSilver}) \ge 2$ **AND** $\text{Conversion Rate} \le 35\%$ | Specialista degli argenti; collezione di finali amare e campionati persi al fotofinish per un soffio. |
| **#7** | **All-or-Nothing** | 🎲 | 🟠 Arancione (`#f97316`) | $\widetilde{FF} \ge 0.45$ **AND** $(\text{Gold} \ge 1$ **OR** $\text{CupGold} \ge 1)$ **AND** $\text{Disonori} \ge 1$ | Montagne russe emotive: oscilla costantemente tra la gloria del trionfo e il baratro della retrocessione. |
| **#8** | **Grinder Metodico** | 🛡️ | 🔵 Ciano (`#06b6d4`) | $PR \ge 30\%$ **AND** $\text{Disonori} = 0$ **AND** $\text{Years} \ge 3$ | Pragmatico, solido e immune ai crolli nei bassifondi; garantisce costanza di rendimento senza mai sbandare. |
| **#9** | **Partecipante** | 👔 | ⚪ Grigio Ardesia (`#94a3b8`) | *Fallback predefinito (nessun criterio sopra)* | Profilo neutro di transizione a metà classifica; in attesa di definire la propria traiettoria storica. |

> [!NOTE]
>
> - **$P$**: Silverware Prestige Points ($3.0 \cdot \text{Gold} + 1.5 \cdot \text{CupGold} + 0.75 \cdot \text{Supercup} + 0.50 \cdot \text{Mundialito}$).
> - **$P_{\text{eff}}$**: Prestigio annualizzato ($P / \text{Years}$).
> - **$\text{Disonori}$**: Somma totale di Cucchiai di Legno (`spoon`) e Cartonati Playout (`cartonato`).
> - **$\text{Finali}$**: Somma di vittorie e secondi posti nelle finali di coppa $(\text{CupGold} + \text{Supercup} + \text{CupSilver} + \text{SupercupSilver})$.

---

## 5. Pilastro IV: Dinamica & Trend Storico Decennale

Il modulo `src/analytics/chronology.ts` sfrutta la cronologia completa delle classifiche e dei punteggi archiviati in `data/seasons/*.json`, articolandosi in due prospettive complementari progettate per la massima leggibilità fantacalcistica e arricchite da modelli di normalizzazione multiformato (campionati a 8, 10 e 12 squadre):

### 5.1 Prospettiva Manager (Rendimento Reale, Fasce Dinamiche & Baricentro Storico)

- **Piazzamento Medio Reale ($\overline{R}_i$)**:
  Media aritmetica dei piazzamenti effettivi conquistati in campionato sulle stagioni disputate ($S_i$):
  $$\overline{R}_i = \frac{1}{S_i} \sum_{t=1}^{S_i} R_{i,t}$$
  Espresso direttamente in posizioni reali (es. `4.0° posto medio`).
- **Normalizzazione Dinamica a 4 Fasce di Rendimento**:
  Dato che la lega è passata da 8 squadre (2016–2018), a 10 squadre (2018–2020), fino a 12 squadre (2020–2026), un piazzamento assoluto (es. 4° o 8° posto) ha un peso e una densità competitiva profondamente diversi a seconda del formato. Ogni piazzamento stagionale viene categorizzato in 4 fasce proporzionali con peso cardinale decrescente:

  | Fascia di Rendimento | Peso ($w$) | Colore UI | 8 Squadre (2016-18) | 10 Squadre (2018-20) | 12 Squadre (2020-26) |
  | :--- | :---: | :---: | :---: | :---: | :---: |
  | 🥇 **Vertice / Podio** | $4$ | 🟡 Oro (`#eab308`) | 1° – 3° (3 sq) | 1° – 3° (3 sq) | 1° – 3° (3 sq) |
  | ⭐ **Alta Classifica** | $3$ | 🟢 Smeraldo (`#10b981`) | 4° (1 sq) | 4° – 5° (2 sq) | 4° – 6° (3 sq) |
  | ⚖️ **Metà Classifica** | $2$ | 🔵 Blu (`#3b82f6`) | 5° – 6° (2 sq) | 6° – 8° (3 sq) | 7° – 10° (4 sq) |
  | 🥄 **Zona Rischio Cucchiaio** | $1$ | 🔴 Rosso (`#ef4444`) | 7° – 8° (2 sq) | 9° – 10° (2 sq) | 11° – 12° (2 sq) |

- **Baricentro Storico ($B_i \in [1.0, 4.0]$)**:
  Sintetizza l'allocazione media del mister lungo l'intera carriera attraverso la media ponderata delle fasce occupate:
  $$B_i = \frac{4 \cdot N_{\text{vertice}, i} + 3 \cdot N_{\text{alta}, i} + 2 \cdot N_{\text{metà}, i} + 1 \cdot N_{\text{rischio}, i}}{S_i}$$
  - **Élite Vertice ($B_i \ge 3.5$)**: Costantemente sul podio o ai vertici assoluti.
  - **Alta Classifica ($2.8 \le B_i < 3.5$)**: Frequente presenza nelle posizioni nobili e rarissime cadute.
  - **Metà Classifica ($2.0 \le B_i < 2.8$)**: Presenza prevalente nella pancia del gruppo.
  - **Zona Rischio ($B_i < 2.0$)**: Frequente esposizione alla lotta retrocessione/cucchiaio.
  Nella tabella manager, il baricentro è visualizzato tramite badge dedicato e una **mini-barra segmentata a 4 colori** con tooltip interattivo che riporta i conteggi e le percentuali esatte per fascia.
- **Percentile di Merito Stagionale ($PM_{i,t} \in [0\%, 100\%]$)**:
  Indicatore continuo ausiliario:
  $$PM_{i,t} = \left(\frac{N_t - R_{i,t}}{N_t - 1}\right) \times 100\%$$
- **Stabilità & Oscillazione Tipica ($\sigma_{R,i}$)**:
  Deviazione standard dei piazzamenti in posizioni nette, che misura quanto un mister oscilla tipicamente da un'annata all'altra:
  $$\sigma_{R,i} = \sqrt{\frac{1}{S_i} \sum_{t=1}^{S_i} (R_{i,t} - \overline{R}_i)^2}$$
  - **Metronomo (⏱️ $\sigma_R < 2.0$ pos.)**: Iper-stabilità statistica, costantemente nelle stesse posizioni ($\pm < 2$ posti).
  - **Equilibrato (⚖️ $2.0 \le \sigma_R \le 3.5$ pos.)**: Fisiologica e sana alternanza tra buone annate e metà classifica.
  - **Montagna Russa (🎢 $\sigma_R > 3.5$ pos.)**: Rendimento polarizzato tra picchi da scudetto e crolli improvvisi.
  - **Esordiente (🌱 $S_i < 3$)**: Minimo 3 stagioni disputate con oscillazione non definita.
- **Gloria & Baratro**:
  - **Podi Totali (🏆)**: Piazzamenti in top-3 (1°, 2°, 3°).
  - **Cucchiai Totali (🥄)**: Ultimi posti in classifica di campionato.
- **Filtri di Visualizzazione**:
  - *Tutti*: intero albo della lega (18 manager).
  - *Veterani*: manager con $\ge 3$ stagioni giocate (13 manager).
  - *Attivi in corso*: manager partecipanti alla stagione corrente 2025/26 (12 manager).

### 5.2 Evoluzione Stagioni (Parità, Gradino Medio & Record di Compattezza)

- **Gradino Medio di Classifica ($\Delta_{\text{gradino}, t}$)**:
  Misura la densità competitiva dividendo la forbice complessiva di punti tra il 1° e l'ultimo per il numero di intervalli di classifica ($N_t - 1$):
  $$\Delta_{\text{gradino}, t} = \frac{\text{Pts}_{1°, t} - \text{Pts}_{\text{ultimo}, t}}{N_t - 1} \quad [\text{pt / posizione}]$$
  Questo parametro normalizza la forbice totale rendendo confrontabili campionati a 8 squadre (7 gradini), 10 squadre (9 gradini) e 12 squadre (11 gradini): un gradino più basso indica che ogni singola posizione di classifica è stata contesa punto su punto.
- **Indice di Compattezza di Lega ($IC_t \in [0, 100]$)**:
  Normalizza il gradino medio rispetto agli estremi storici registrati nel decennio ($\Delta_{\text{gradino}, \min} = 1.91 \dots \Delta_{\text{gradino}, \max} = 5.86$ pt/pos):
  $$IC_t = \text{round}\left(100 - \frac{\Delta_{\text{gradino}, t} - \Delta_{\text{gradino}, \min}}{\Delta_{\text{gradino}, \max} - \Delta_{\text{gradino}, \min}} \times 100\right)$$
  - **Record Storico Assoluto**: La stagione **2022/23** (12 squadre) detiene il primato storico con soli **1.91 pt/gradino** ($IC = 100$, forbice di 21 pt spalmata su 11 salti), superando il campionato 2018/19 a 10 squadre (2.22 pt/gradino).
- **Lotta Podio ($\Delta_{\text{podio}, t}$)**:
  Scarto in punti tra il 1° e il 3° classificato ($S_{1,t} - S_{3,t}$).
  - $\le 4 \text{ pt}$: *Volata a Tre 🏁*
  - $5 \dots 9 \text{ pt}$: *Corsa Aperta ⚔️*
  - $\ge 10 \text{ pt}$: *Podio Sgranato 🚀*
- **Fuga dal Cucchiaio ($\Delta_{\text{cucchiaio}, t}$)**:
  Scarto in punti tra il penultimo e l'ultimo classificato ($S_{N-1,t} - S_{N,t}$).
  - $\le 2 \text{ pt}$: *Playout Thriller ⚡*
  - $3 \dots 7 \text{ pt}$: *Lotta Salvezza 🛡️*
  - $\ge 8 \text{ pt}$: *Crollo Isolato 📉*
- **Tolleranza Storica (2020/21)**:
  Per le annate prive di punteggi completi archiviati (2020/21), l'interfaccia visualizza con badge esplicito `⚠️ Punti non archiviati` l'assenza del dato numerico senza generare anomalie visive o alterare il range degli altri campionati, preservando l'integrità dei verdetti ufficiali (Campione AS CorradiAndRosatiTeam e Cucchiaio Partizan Peroni).

### 5.3 Sistema Unificato dei Badge Allenatore (`src/analytics/badges.ts`)

Per garantire assoluta coerenza visiva e concettuale tra la **Scheda Profilo** (`ProfileModal`) e la **Trading Card** collezionabile (`cardTemplate`), tutti i riconoscimenti comportamentali e onorari sono centralizzati in una **singola sorgente di verità**:

1. **Badge Analitici Strutturati** (sempre presenti in apertura di bacheca):
   - **`Profilo: <Archetipo>`**: determinato dal waterfall a 9 priorità comportamentali.
   - **`Rischio: <Polarità NTI>`**: polarità asimmetrica di coda (*Cannibale Assoluto*, *Attaccante Efficace*, *Neutro / Bilanciato*, *Vulnerabile*, *Bersaglio Mobile*).
   - **`Stabilità: <Categoria>`**: dispersione posizionale $\sigma_R$ con minimo 3 stagioni giocate:
     - ⏱️ `Stabilità: Metronomo di Lega` ($\sigma_R < 2.0$, Verde Smeraldo `#10b981`)
     - ⚖️ `Stabilità: Equilibrato` ($2.0 \le \sigma_R \le 3.5$, Blu Zaffiro `#3b82f6`)
     - 🎢 `Stabilità: Montagna Russa` ($\sigma_R > 3.5$, Ambra `#f59e0b`)
     - 🌱 `Stabilità: Esordiente` ($N < 3$ stagioni, Ardesia `#94a3b8`)
2. **Badge Onorari & di Merito Storico** (sblocco progressivo in base al palmarès):
   - 🛡️ **Veterano della Lega**: $\ge 6$ stagioni disputate.
   - 👑 **Re dei Titoli**: $\ge 4$ titoli major vinti.
   - ⭐ **Campione Seriale**: $\ge 2$ scudetti di campionato vinti.
   - 🌟 **Double Winner**: almeno 1 Scudetto e almeno 1 Coppa InsalAtlas vinti.
   - 🏆 **Re delle Coppe**: $\ge 3$ trofei tra Coppe e Supercoppe.
   - ☠️ **Incubo Playout**: $\ge 2$ cartonati/retrocessioni da playout subiti.
   - 🥄 **Collezionista Cucchiai**: $\ge 2$ cucchiai di legno (ultimi posti in campionato).

---

## 6. Roadmap & Evoluzioni Future (TODO)

### 6.1 Global Clutch Index ($GCI$)

Per unificare in un unico indicatore sintetico sia la capacità di convertire la maratona di campionato sia la letalità nelle finali secche a eliminazione diretta, è pianificata l'introduzione del **Global Clutch Index ($GCI$)**:

$$GCI_i = w_{\text{league}} \cdot KI_i + w_{\text{cups}} \cdot CR_i$$

- **Pesi del GCI da calibrare in futuro** (es. 50% Campionato e 50% Coppe, oppure sbilanciato a favore del Campionato), con gestione neutra per chi non ha ancora disputato finali di coppa.
- **Integrazione Storico Mundialito**: Formalizzazione dello storico finale Mundialito (vinti e persi) per completare il set di dati delle coppe della lega.
