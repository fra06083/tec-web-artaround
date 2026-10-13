# Insegnamento di Tecnologie Web
# CdS In Informatica   
# (A.A. 2025-26)

# Progetto ArtAround 18-27   
 
# READ ME DEL PROGETTO ARTAROUND

## Nome del gruppo: 
Whatsappatori


## Membri del gruppo 

* Nome e cognome: Francesco Biglieri, matricola: 0001090725, mail: francesco.biglieri@studio.unibo.it
* Nome e cognome: Hermes Perra, matricola: 0001117064, mail: hermes.perra@studio.unibo.it
* Nome e cognome: Caterina Chiavellati, matricola: 0001071021, mail: caterina.chiavellati@studio.unibo.it
* LLM (nome e versione e licenza): Gemini (Gemini 3.6 Flash - Licenza Proprietaria Google DeepMind)

_Il primo membro della lista verrà considerato come punto di contatto primario. Sarà la persona 
incaricata di spedire mail (sempre e solo dall'indirizzo studio.unibo.it) e tenere contatti con i docenti. Ogni mail deve sempre includere tutti i componenti del gruppo in cc, e deve essere indirizzata a tutti i docenti del corso:_ 

* fabio.vitali@unibo.it
* andrea.schimmenti2@unibo.it
* gianmarco.spinaci2@unibo.it
* remo.grillo@unibo.it

## Tipo progetto
18-27


## Data di disponibilità delle applicazioni: 31/07/2026 (_ Al massimo 15 giorni dopo la data di sottomissione del file README_)

## Locazione del progetto:

* URI del marketplace: https://site252632.tw.cs.unibo.it/marketplace
* URI del navigator: https://site252632.tw.cs.unibo.it/navigator
* Altri URI rilevanti: 
  - https://site252632.tw.cs.unibo.it/editor/dashboard (Dashboard Gestione Editor / Admin)
  - https://site252632.tw.cs.unibo.it (Menu principale / Landing page)
* URI per accedere ai dati nel DB:
  - https://site252632.tw.cs.unibo.it/api/museums
  - https://site252632.tw.cs.unibo.it/api/artworks
  - https://site252632.tw.cs.unibo.it/api/visite


## Organizzazione dei sorgenti
* _creare una directory source all'interno della directory html_
* _Cambiare i permessi di accesso a questi file a 755 e 644_
* _Creare una directory per applicazione più una directory per la applicazione server-side_
* _Descrivere qui l'organizzazione interna di queste directory_
L'organizzazione del progetto rispetta la struttura MVC (Model-View-Controller) con separazione tra il backend server-side in Node.js/Express e le due applicazioni frontend (l'Editor-Marketplace statico/Alpine.js e il Navigator in React):

/                               # Root di progetto
├── README.md
├── package.json                # Dipendenze globali di root
│
├── backend/                    # APPLICAZIONE SERVER-SIDE (Node.js & Express)
│   ├── index.js                # Entry-point del server Express, connessione MongoDB e rotte
│   ├── docker-compose.yml      # File di utilizzato per coordinare lo sviluppo in locale per il database MongoDB
│   ├── package.json            # Dipendenze backend (express, mongoose, jsonwebtoken, bcrypt, ecc.)
│   ├── models/                 # Schemi Mongoose 
│   │   ├── museums.js          # Schemi per Musei, Opere (Item), Visite, Linguaggi e Quiz
│   │   └── user.js             # Schema Utenti, ruoli e permessi sui musei
│   ├── middleware/             # Middleware Express di protezione e autorizzazione
│   │   ├── auth.js             # Autenticazione dei token JWT da cookie HTTP-Only / header
│   │   └── museumAccess.js     # Controllo accessi per editor sui singoli musei
│   ├── controllers/            # Controller per la logica di funzionamento
│   │   ├── museumController.js # Gestione CRUD musei, piantine e cancellazione a cascata
│   │   ├── artworkController.js# Gestione opere e descrizioni multilivello
│   │   ├── visitsController.js # Gestione catalogo visite, filtri e ordinamenti
│   │   ├── userManagementController.js # Gestione ruoli e permessi utenti da parte degli Admin
│   │   └── adminController.js  # Statistiche di sistema e dashboard amministrative
│   ├── routes/                 # Mappatura Express Router per ciascun modulo API
│   └── views/                  # Viste HTML protette per la dashboard dell'Editor/Admin
│
└── public/                     # RISORSE STATICHE E FRONTEND APPLICATIONS
    ├── css/                    # Fogli CSS modulari (base, effects, mobile-nav, forms, ecc.)
    ├── js/                     # Moduli JavaScript Client-side per l'Editor (index, museum, artworks, tours, users)
    ├── images/                 # immagini musei, opere e propic degli utenti
    ├── editor-marketplace/     # Applicazione Marketplace ed Editor (HTML + Alpine.js + Bootstrap)
    └── navigator/              # APPLICAZIONE NAVIGATOR (React 19 + Vite)
        ├── src/                # Sorgenti JSX dell'app React (VisitDetail, VisitList, Lobby, Profile, RoomJoin, api.js)
        ├── dist/               # Bundle di produzione compilato da Vite e servito da Express
        ├── package.json        # Dipendenze dell'applicazione React Navigator
        └── vite.config.js      # Configurazione Vite


## Tecnologie utilizzate:

#### Server-side
- Node.js, Express, MongoDB, dotenv, JWT


#### Applicazione marketplace (Editor-Marketplace)
- Alpine.js, JavaScript (vanilla), HTML, css (+ Bootstrap)


#### Applicazione navigator
- JavaScript (vanilla), React, Vite, web speech API


## Contributo individuale

#### Francesco Biglieri:

1. Server e ambiente di lavoro
Configurazione del server Express in index.js, gestione di MongoDB tramite Docker e impostazione del file .env. Creazione della procedura automatica con GitHub Actions per aggiornare il sito su server ad ogni modifica.

2. API del backend
Creazione delle rotte e della logica per la gestione dei musei, delle opere e delle visite. Realizzazione delle funzioni per vedere le statistiche di sistema e per importare o esportare i dati in formato JSON.

3. Interfaccia grafica ed Editor
Sviluppo della parte grafica dell'Editor e del Marketplace usando HTML, CSS, Bootstrap e Alpine.js. Realizzazione della dark mode, dei menu di navigazione, della grafica per cellulari e della modale del profilo.

4. Funzioni vocali e Live Tour
Inserimento dei comandi vocali tramite microfono e dell'ascolto audio con sintesi vocale per le spiegazioni delle opere. Sviluppo della schermata Live Tour per guidare le visite di gruppo in tempo reale.

5. Gestione catalogo e salvataggi
Realizzazione delle schede visive dei musei con filtri di ricerca e supporto al caricamento delle immagini di copertina per ciascun museo.


#### Hermes Perra:

- Autenticazione e sicurezza utenti
Gestione dell'accesso con token JWT salvati nei cookie di sessione e controllo dei permessi sulle pagine per reindirizzare al login gli utenti non autorizzati.

- Controllo dei permessi sui musei
Creazione del sistema per limitare gli utenti editor alla sola modifica dei musei assegnati. Realizzazione delle pagine e delle API per permettere agli amministratori di cambiare ruoli e permessi.

- Gestione dei dati e descrizioni
Inserimento della cancellazione automatica di visite ed opere quando viene eliminato un museo. Gestione dei quattro livelli di testo per le descrizioni delle opere (infantile, semplice, medio e dettagliato).

- Sviluppo in React e pulizia del codice
Realizzazione dei componenti React per la gestione del profilo, della stanza d'attesa e dell'accesso ai tour live tramite codice. Correzione di problemi grafici ed eliminazione delle credenziali sensibili dal repository.

- Protezione API e gestione sessioni
Verifica della scadenza dei token di accesso e riscrittura dei middleware per evitare blocchi o caricamenti infiniti durante la connessione al database.


#### Caterina Chiavellati:

* **Struttura base Navigator**: impostazione iniziale dell'applicazione React per il Navigator tramite Vite e organizzazione dei componenti.
* **Pagine principali**: sviluppo della pagina del catalogo visite con filtri per museo e della pagina di dettaglio per scorrere le opere della visita un passo alla volta.
* **Sistema di Quiz**: creazione dei quiz sia nella parte editor per la loro composizione, sia nel Navigator per permettere agli utenti di rispondere e calcolare il punteggio.
* **Mappa interattiva e punti d'interesse**: inserimento delle piantine dei musei con visualizzazione della posizione corrente della stanza e dei punti di interesse.
* **Audio e regolazione del testo**: integrazione della sintesi vocale per la lettura delle opere e dei tasti per aumentare o ridurre la spiegazione.
* **Fruizione multilivello**: implementazione dei selettori che consentono ai visitatori di cambiare la complessità del testo durante la lettura della scheda dell'opera.


#### LLM:
Supporto nella riscrittura e pulizia del codice più lungo, risoluzione di errori nelle rotte del server e aiuto nella stesura della documentazione.
Aiuto nella gestione del refactoring del lato frontend e nella gestione del riconoscimento dei comandi del TTS (anche riconoscimento vocale).
Calcolo coordinate esatte pin all'interno della piantina.


#### Note:
- Username, password e codici mnemonici per accedere alle visite condivise sono case sensitive
- L'autenticazione è centralizzata tramite token JWT memorizzati in cookie HTTP-Only con durata di 7 giorni.
- Esiste un utente di default admin (password: 12345678) per la gestione dei permessi, la visualizzazione delle analytics e l'import/export dei dati JSON.

tutto il sito è visitabile anche da mobile anche se in editor sarebbe raccomandato da PC (fatto per possibilità di modifiche veloci e per poter accedere alla dashboard per le dirette).
L'utente può scegliere se abilitare la dark mode e sarà attivata per tutto il sito, senza necessità di farlo ogni volta (cookie sincronizzato).
L'utente da ogni pagina può accedere alle sue impostazioni dove potrà aggiungere immagine profilo e cambiare il suo linguaggio di default (e.g. l'utente sceglie di accedere subito con linguaggio dettagliato alle visite)
- Il comando "Trasmetti" permette al docente o chi fa partire la visita di riprodurre a tutti coloro che stanno seguendo la visita guidata, di far partire l'audio con la scelta di linguaggio al momento scelto dalla guida/docente.
- La scelta implementativa dei pin è stata fatta per poter dare una maggiore possibilità all'editor di poter aggiungere e modificare posizioni delle sale con più semplicità, una sala può contenere più opere, e sono visibili sia durante la visita (aprendo la mappa o dicendo "Mappa" o nel marketplace, nella sezione mappa del museo)

#### Ruoli
- admin ha accesso a tutta la gestione del sito, può inserire nuovi autori, cambiare permessi e gestire tutto (musei, visite ecc)
- autore: può creare nuove visite e aggiungere opere al museo a lui assegnato, può fare dirette (visita guidata) di qualunque visita del museo assegnato.
- docente: può creare nuove visite e fare dirette solamente di quelle create da lui.
- visitatore: ruolo base utente del sito, può accedere alle visite che acquista e alle dirette
