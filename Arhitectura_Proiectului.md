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
│   │   └── flashcardRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── deckController.js
│   │   └── flashcardController.js
│   └── models/
│       ├── User.js
│       ├── Deck.js
│       └── Flashcard.js
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── DeckCard.jsx
        │   └── Navbar.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── DeckDetails.jsx
            └── StudyMode.jsx
```

---

## 1. Backend

Backend-ul este o aplicație Node.js care utilizează framework-ul Express.js pentru a expune un API RESTful. Arhitectura sa urmează un model de tip **Model-Controller-Route**, care separă riguros responsabilitățile.

### 📄 `server.js`
Punctul de intrare (entrypoint) pentru serverul Node.js. Acest fișier este responsabil pentru configurarea instanței Express, aplicarea de middleware-uri globale (ex: CORS, parsarea body-ului cererilor JSON), inițializarea conexiunii la baza de date MongoDB și încărcarea modulelor de rutare.

### 📁 `backend/models/`
Acest director conține definițiile de scheme Mongoose, care modelează structura datelor în colecțiile din baza de date MongoDB.

- **`User.js`**: Definește schema pentru modelul `User`. Aceasta specifică structura unui utilizator, incluzând câmpuri pentru email, parolă (stocată ca hash `bcrypt`) și referințe către pachetele create de acesta.
- **`Deck.js`**: Definește schema pentru modelul `Deck`. Descrie structura unui pachet de carduri (deck), conținând câmpuri precum titlu, descriere, și o referință (`creator`) către utilizatorul care l-a creat. De asemenea, include un câmp virtual `flashcards` pentru a stabili relația cu modelul `Flashcard`.
- **`Flashcard.js`**: Definește schema pentru modelul `Flashcard`. Specifică structura unui card individual, incluzând câmpuri pentru textul de pe față (`frontText`) și spate (`backText`), o referință (`deckId`) către pachetul din care face parte și metadate pentru algoritmul de repetiție spațiată (interval, repetition, easeFactor).

### 📁 `backend/routes/`
Acest director definește endpoint-urile API-ului. Fiecare fișier mapează rute HTTP (ex: `GET /api/decks`) la funcțiile corespunzătoare din controllere.

- **`authRoutes.js`**: Definește rutele pentru autentificare, precum `/register` și `/login`. Acestea fac legătura între cererile HTTP și logica de business din `authController`.
- **`deckRoutes.js`**: Definește rutele API pentru operațiile CRUD (Create, Read, Update, Delete) asupra pachetelor de carduri. Asociază cereri precum `GET /api/decks/mine` cu funcțiile corespunzătoare din `deckController`.
- **`flashcardRoutes.js`**: Definește rutele pentru gestionarea cardurilor individuale. Gestionează adăugarea de carduri noi (`POST /api/flashcards`), importul CSV și actualizarea stării unui card în timpul studiului.

### 📁 `backend/controllers/`
Acest director conține logica de business a aplicației. Controllerele primesc cereri de la rute, interacționează cu modelele pentru operații pe baza de date și returnează un răspuns către client.

- **`authController.js`**: Conține logica pentru autentificarea utilizatorilor. Implementează înregistrarea (cu hash-uirea parolei), validarea credențialelor la login și generarea de token-uri web JSON (JWT) pentru managementul sesiunilor securizate.
- **`deckController.js`**: Implementează logica pentru operațiile legate de pachetele de carduri. Funcțiile de aici gestionează crearea, ștergerea și regăsirea pachetelor, folosind metoda `.populate()` pentru a încărca și cardurile asociate.
- **`flashcardController.js`**: Conține logica de business pentru carduri. Se ocupă de adăugarea cardurilor noi într-un pachet, de procesarea importurilor din fișiere CSV și de aplicarea algoritmului de repetiție spațiată SuperMemo-2 (SM-2) pentru a recalcula atributele de studiu ale unui card pe baza evaluării utilizatorului.

---

## 2. Frontend

Frontend-ul este o **Single Page Application (SPA)** construită cu React. Utilizează Vite.js pentru un mediu de dezvoltare rapid și este structurată pe bază de componente.

### 📄 `App.jsx`
Componenta rădăcină a aplicației React. Este responsabilă pentru configurarea sistemului de rutare client-side cu `react-router-dom`, definind ce componentă de tip "pagină" se afișează pentru fiecare URL. De asemenea, încapsulează layout-ul global, cum ar fi bara de navigație, care este vizibilă pe toate paginile.

### 📁 `frontend/src/pages/`
Acest director conține componentele de nivel superior, care corespund unor pagini distincte ale aplicației.

- **`Dashboard.jsx`**: Reprezintă "panoul de bord" pe care utilizatorul îl vede după autentificare. Această pagină execută o cerere către API pentru a prelua și afișa o listă a tuturor pachetelor de carduri (standard și create de utilizator), folosind componente `DeckCard`.
- **`DeckDetails.jsx`**: Afișează detaliile unui pachet selectat, inclusiv o listă a tuturor cardurilor componente. Permite adăugarea manuală de carduri noi sau importul acestora dintr-un fișier CSV și conține un link pentru a porni o sesiune de studiu.
- **`StudyMode.jsx`**: Implementează interfața interactivă pentru sesiunea de studiu. Preia cardurile eligibile pentru studiu dintr-un pachet, le afișează secvențial și gestionează interacțiunea (afișarea răspunsului, trimiterea evaluării de la 0 la 5 către backend) pentru a actualiza progresul învățării conform algoritmului SM-2.

### 📁 `frontend/src/components/`
Acest director conține componente React reutilizabile, care sunt folosite pentru a construi paginile.

- **`Navbar.jsx`**: O componentă reutilizabilă care reprezintă bara de navigație a aplicației. Afișează link-uri către secțiunile principale (ex: Dashboard) și gestionează funcționalitatea de delogare prin ștergerea token-ului JWT din `localStorage`.
- **`DeckCard.jsx`**: Este o componentă de prezentare, reutilizabilă, utilizată în `Dashboard.jsx`. Afișează informațiile sumare ale unui singur pachet (titlu, descriere) într-un format vizual de tip "card" și oferă link-uri de navigație către detalii sau modul de studiu.
