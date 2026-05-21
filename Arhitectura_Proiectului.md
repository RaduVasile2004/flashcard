 # Arhitectura Proiectului: Intelligent Flashcards

Acest document descrie arhitectura tehnică a aplicației "Intelligent Flashcards", o platformă full-stack construită pe baza arhitecturii MERN (MongoDB, Express.js, React, Node.js). Proiectul este structurat în două componente principale: un **Backend** (server-side) care gestionează logica de business și un **Frontend** (client-side) care oferă interfața cu utilizatorul.

---

## Structura de Fișiere și Responsabilități

Mai jos este prezentată o structură arborescentă a fișierelor și directoarelor esențiale, urmată de o explicație a responsabilităților fiecărui modul.

```
Arhitectura_Proiectului/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── deckRoutes.js
│   │   ├── flashcardRoutes.js
│   │   └── sessionRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── deckController.js
│   │   ├── flashcardController.js
│   │   └── sessionController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── utils/
│   │   ├── verificationToken.js
│   │   └── sendEmail.js
│   └── models/
│       ├── User.js
│       ├── Deck.js
│       ├── Flashcard.js
│       └── StudySession.js
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── DeckCard.jsx
        │   └── Navbar.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── DeckDetails.jsx
            ├── StudyMode.jsx
            ├── Analytics.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── CheckEmail.jsx
            ├── VerifyEmail.jsx
            ├── ForgotPassword.jsx
            └── ResetPassword.jsx
```

---

## 1. Backend

Backend-ul este o aplicație Node.js care utilizează framework-ul Express.js pentru a expune un API RESTful. Arhitectura sa urmează un model de tip **Model-Controller-Route**, completat cu module de **middleware** și **utils**, care separă riguros responsabilitățile.

### 📄 `server.js`
Punctul de intrare (entrypoint) pentru serverul Node.js. Acest fișier este responsabil pentru configurarea instanței Express, aplicarea de middleware-uri globale (CORS, parsarea body-ului JSON), inițializarea conexiunii la MongoDB prin `mongoose.connect` și montarea modulelor de rutare sub prefixele `/api/auth`, `/api/decks`, `/api/flashcards` și `/api/sessions`. La pornire apelează `seedStandardDecks` pentru a popula pachetele standard (operație idempotentă, non-distructivă: rulează doar dacă nu există deja pachete standard în baza de date).

### 📁 `backend/models/`
Acest director conține definițiile de scheme Mongoose, care modelează structura datelor în colecțiile din baza de date MongoDB.

- **`User.js`**: Definește schema pentru modelul `User`. Conține `username`, `email` (unic), `password` (hash `bcrypt`), `streak`, `lastLogin`, precum și câmpuri pentru fluxul de confirmare a emailului (`isVerified`, `verificationTokenHash`, `verificationTokenExpires`) și pentru resetarea parolei (`resetTokenHash`, `resetTokenExpires`).
- **`Deck.js`**: Definește schema pentru modelul `Deck`. Conține `title`, `description`, `tags`, o referință `creator` către `User` și flag-ul `isStandard` care marchează pachetele publice, read-only, livrate odată cu aplicația. Include un câmp virtual `flashcards` (populat prin `populate('flashcards')`) care stabilește relația one-to-many cu `Flashcard` pe baza `deckId`.
- **`Flashcard.js`**: Definește schema pentru modelul `Flashcard`. Conține `frontText`, `backText`, `deckId` și metadatele pentru algoritmul de repetiție spațiată SM-2: `interval`, `repetition`, `easeFactor`, `nextReviewDate`, plus un contor `lapses` incrementat la fiecare review eșuat (grade < 3), folosit pentru detecția cardurilor-problemă ("leech").
- **`StudySession.js`**: Definește schema pentru o sesiune de studiu finalizată. Conține `user`, `deck`, `startedAt`, `endedAt`, un sub-document `reviews` (listă de `{ card, grade, msSpent }`) și un obiect `totals` precomputat pe server (`count`, `correct`, `avgGrade`, `durationMs`). Indexat pe `(user, endedAt desc)` pentru a optimiza listările recente.

### 📁 `backend/middleware/`

- **`authMiddleware.js`**: Conține două middleware-uri JWT. `protect` blochează rutele private — verifică prezența și validitatea token-ului, încarcă utilizatorul din DB, returnează 401 dacă tokenul lipsește, este invalid sau utilizatorul a fost șters. `optionalAuth` populează `req.user` dacă tokenul este valid, dar permite trecerea anonimă în caz contrar (folosit pentru endpoint-ul de căutare).

### 📁 `backend/utils/`

- **`verificationToken.js`**: Generează token-uri criptografic sigure (32 bytes hex) pentru confirmarea emailului (TTL 24h) și pentru resetarea parolei (TTL 1h). Token-ul "raw" este trimis în link, iar în baza de date se stochează doar hash-ul SHA-256, pentru ca o scurgere a DB-ului să nu expună link-uri active.
- **`sendEmail.js`**: Abstracție peste `nodemailer`. În producție folosește un transport SMTP configurat prin variabilele de mediu `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`. În dezvoltare folosește `jsonTransport` și loghează link-ul în consola backend-ului. Expune `sendVerificationEmail` și `sendPasswordResetEmail`.

### 📁 `backend/routes/`
Acest director definește endpoint-urile API-ului. Fiecare fișier mapează rute HTTP la funcțiile corespunzătoare din controllere.

- **`authRoutes.js`**: Expune `POST /register`, `POST /login`, `GET /verify-email/:token`, `POST /resend-verification`, `POST /forgot-password`, `POST /reset-password/:token`.
- **`deckRoutes.js`**: Expune `POST /seed`, `POST /` (creare), `GET /mine`, `GET /standard`, `GET /search` (cu `optionalAuth`, înregistrat înaintea rutei dinamice pentru a nu fi umbrit), `GET /:id` și `PUT /:id` (editare metadate).
- **`flashcardRoutes.js`**: Expune `POST /` (creare), `GET /stats`, `POST /:id/review`, `GET /:deckId/review` (carduri scadente), `GET /:deckId/cards-stats` (lapses + flag leech per card), `POST /:deckId/import` (CSV), `DELETE /:id` și `PUT /:id` (editare text).
- **`sessionRoutes.js`**: Expune `POST /` (înregistrare sesiune), `GET /recent` (limit max 50), `GET /:id` (detaliu sesiune).

### 📁 `backend/controllers/`
Acest director conține logica de business a aplicației. Controllerele primesc cereri de la rute, interacționează cu modelele și returnează un răspuns către client.

- **`authController.js`**: Gestionează tot ciclul de viață al autentificării. La înregistrare creează utilizatorul cu `isVerified=false` și trimite emailul de confirmare; login-ul respinge cu `403 needsVerification` conturile neconfirmate. Implementează `verifyEmail` (consumă tokenul de confirmare și auto-loghează prin JWT), `resendVerification` (răspuns generic pentru a preveni enumerarea de emailuri), `forgotPassword` și `resetPassword` (similar, cu auto-verificare a emailului dacă resetul reușește).
- **`deckController.js`**: Logica pentru pachete. Conține CRUD-ul (`createDeck`, `getUserDecks`, `getStandardDecks`, `getDeckById`, `updateDeck`), funcția `searchDecks` (regex case-insensitive cu escape pe `title`/`description`/`tags`, limit 50, întoarce separat `mine` și `standard`) și `seedStandardDecks` — non-distructivă: rulează doar dacă nu există deja pachete standard, pentru a nu șterge progresul SM-2 al utilizatorilor la fiecare restart. `getDeckById` verifică ownership-ul: pachetele standard sunt vizibile pentru orice utilizator autentificat, restul doar pentru creator.
- **`flashcardController.js`**: Logica pentru carduri. Conține `createFlashcard`, `updateFlashcard`, `deleteFlashcard` (toate cu verificare ownership și blocare pe pachete standard), `importFlashcards` (bulk via CSV) și `reviewFlashcard` care aplică algoritmul SM-2: la `grade >= 3` actualizează `interval`/`repetition` și recalculează `easeFactor` (minim 1.3), iar la `grade < 3` resetează intervalul la 1 zi și incrementează contorul `lapses`. `getCardsToReview` returnează cardurile scadente, `getUserStats` agregă statistici globale (carduri studiate, distribuție pe dificultate după `easeFactor`, revizuiri în următoarele 7 zile) și `getDeckCardsStats` returnează per-card `lapses`/`isLeech` (prag implicit 4 ratări) plus totaluri pe pachet.
- **`sessionController.js`**: Persistă sesiunile de studiu. `createSession` validează payload-ul de la frontend (deck accesibil, reviews non-vide, grade-uri în 0–5), sanitizează intrările și recalculează `totals` pe server (nu se încrede în client). `getRecentSessions` returnează lista paginată populată cu `deck.title` (fără sub-documentul `reviews` pentru economie de bandă), iar `getSessionById` întoarce detaliul complet cu `reviews.card` populat (frontText/backText), restricționat la owner.

---

## 2. Frontend

Frontend-ul este o **Single Page Application (SPA)** construită cu React 19 și Vite. Folosește `react-router-dom` v7 pentru rutare, `axios` pentru cereri HTTP, `recharts` pentru grafice, `react-markdown` pentru randarea conținutului cardurilor și `papaparse` pentru parse-ul CSV-urilor importate. Stilizarea este realizată prin **CSS Modules** (`*.module.css`), iar tema (light/dark) este controlată prin variabile CSS persistate în `localStorage`.

### 📄 `App.jsx`
Componenta rădăcină. Configurează `BrowserRouter` și înregistrează toate rutele aplicației: `/` (Dashboard), `/analytics`, `/login`, `/register`, `/check-email`, `/verify-email/:token`, `/forgot-password`, `/reset-password/:token`, `/deck/:deckId` și `/study/:deckId`. Gestionează starea globală a temei (light/dark) prin atributul `data-theme` aplicat pe `<html>` și încapsulează layout-ul comun (Navbar).

### 📁 `frontend/src/pages/`
Acest director conține componentele de nivel superior, care corespund unor pagini distincte ale aplicației.

- **`Dashboard.jsx`**: Pagina principală după autentificare. Afișează pachetele utilizatorului și pachetele standard. Conține o bară de căutare debounced (300ms) care interoghează `GET /api/decks/search` și înlocuiește listele când există un query, restaurând listele implicite când câmpul este golit. Conține și formularul pentru crearea unui pachet nou.
- **`DeckDetails.jsx`**: Detaliul unui pachet. Permite editarea inline a titlului și descrierii (pentru pachete proprii), adăugarea manuală a cardurilor, importul din CSV (via `papaparse`), editarea inline (text față/spate) și ștergerea cardurilor. Pentru fiecare card afișează badge-uri cu numărul de ratări (`✗ N`) sau marcajul roșu `🐛 Leech` pentru cardurile-problemă, plus un sumar de avertizare în partea de sus când există leech-uri în pachet. Datele de leech sunt încărcate din `GET /api/flashcards/:deckId/cards-stats`.
- **`StudyMode.jsx`**: Interfața de studiu. Preia cardurile scadente, le afișează secvențial cu flip animation și buton de text-to-speech (`SpeechSynthesisUtterance`), gestionează grade-urile 0/3/4/5 și măsoară timpul petrecut pe fiecare card. La final trimite întreaga sesiune către `POST /api/sessions` (cu guard împotriva dublelor înregistrări) și afișează un ecran sumar compact cu acuratețe, notă medie, durată și tally pe grade.
- **`Analytics.jsx`**: Pagina de statistici. Încarcă în paralel `GET /api/flashcards/stats` (carduri studiate, distribuție pe dificultate via `PieChart` din Recharts, revizuiri în 7 zile) și `GET /api/sessions/recent?limit=10` (listă de sesiuni recente cu deck, dată, număr de carduri, acuratețe, notă medie și durată).
- **`Login.jsx`**: Formular de login. Tratează cazul `403 needsVerification` afișând un buton de retrimitere a emailului de confirmare și include un link către `/forgot-password`.
- **`Register.jsx`**: Înregistrare. Nu auto-loghează — la succes redirecționează către `/check-email` cu emailul în router state.
- **`CheckEmail.jsx`**: Ecran informativ post-înregistrare cu buton de retrimitere a emailului de confirmare.
- **`VerifyEmail.jsx`**: Apelează `GET /api/auth/verify-email/:token` la mount, salvează JWT-ul primit în `localStorage` și redirecționează către `/`.
- **`ForgotPassword.jsx`**: Formular pentru solicitarea resetării parolei. Trimite emailul către `POST /api/auth/forgot-password` și afișează răspunsul generic (același mesaj indiferent dacă emailul există, pentru a preveni enumerarea).
- **`ResetPassword.jsx`**: Formular pentru setarea unei parole noi pe baza tokenului din link. Validează lungimea minimă și potrivirea celor două câmpuri, apoi auto-loghează utilizatorul la succes.

### 📁 `frontend/src/components/`
Acest director conține componente React reutilizabile, care sunt folosite pentru a construi paginile.

- **`Navbar.jsx`**: Bara de navigație. Afișează link-uri către Dashboard și Statistici, un buton de schimbare a temei și butonul de Logout (care șterge JWT-ul din `localStorage` și redirecționează la `/login`). Pentru utilizatorii neautentificați afișează link-uri către Login și Register.
- **`DeckCard.jsx`**: Componentă de prezentare. Afișează informațiile sumare ale unui pachet (titlu, descriere) într-un format vizual de tip "card" și oferă link spre detaliile pachetului.

---

## 3. Flux de Date și Securitate

- **Autentificare**: JWT semnat cu `JWT_SECRET`, valid 30 zile, trimis în headerul `Authorization: Bearer <token>`. Token-ul este stocat în `localStorage` pe client.
- **Confirmare email & reset parolă**: Token-uri criptografic sigure (32 bytes random), stocate hashate (SHA-256) în baza de date. Link-ul "raw" este trimis o singură dată prin email și expiră (24h pentru confirmare, 1h pentru reset). Endpoint-urile de retrimitere și de forgot-password răspund generic pentru a preveni enumerarea conturilor.
- **Algoritm de învățare**: SM-2 implementat în `reviewFlashcard`, cu un contor de `lapses` adăugat pentru detecția cardurilor-problemă (leech threshold = 4).
- **Reguli de acces pe pachete**: Pachetele standard (`isStandard: true`) sunt read-only pentru toți utilizatorii — orice tentativă de mutare (creare/editare/ștergere de carduri, editare deck) este respinsă cu 403. Pachetele proprii sunt modificabile doar de creator.
- **Variabile de mediu**: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL` (default `http://localhost:5173`), `PORT` (default 5000), iar opțional pentru emailul real `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`.
