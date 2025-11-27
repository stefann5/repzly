# Workout Tracker

## Opis problema

Workout Tracker je mikroservisna aplikacija namenjena ljubiteljima fitnes treninga koja omogućava praćenje napretka kroz struktuirane trenažne programe. Aplikacija rešava sledeće probleme:

- **Nedostatak strukture** - Većina korisnika nema jasno definisan plan treninga i ne zna kako da prati napredak
- **Praćenje progresa** - Korisnici nemaju centralizovan sistem za praćenje volumena, intenziteta i učestalosti treninga
- **Povezivanje trenera i korisnika** - Trenerima je potreban alat za kreiranje i distribuciju programa većem broju korisnika
- **Analitika treninga** - Nedostatak uvida u razvoj pojedinih mišićnih grupa i ukupan obim rada
- **Mobilna pristupačnost** - Potreba za aplikacijom koja omogućava praćenje treninga u realnom vremenu u teretani

## Korisnici sistema

Sistem podržava sledeće tipove korisnika:

1. **Neautentifikovani korisnik** - Pristup samo login i registracionoj formi
2. **User** - Osnovni korisnik koji trenira i prati svoj napredak
3. **Coach** - Kreator trenažnih programa
4. **Admin** - Upravlja vežbama u sistemu

## Predloženo rešenje

Sistem je dizajniran kao **mikroservisna aplikacija** koja se sastoji od **4 glavna servisa**, svaki sa svojom bazom podataka prilagođenom specifičnoj nameni.

### Arhitektura sistema

#### 1. User Service
- **Odgovornosti:** Autentifikacija, autorizacija, upravljanje korisnicima
- **Tehnologije:** Rust (Axum), PostgreSQL
- **Ključne funkcionalnosti:** Registracija, autentifikacija (JWT), upravljanje ulogama

#### 2. Program Service
- **Odgovornosti:** Kreiranje i upravljanje programima i vežbama
- **Tehnologije:** Rust (Axum), MongoDB
- **Ključne funkcionalnosti:** CRUD operacije za programe, struktuiranje programa po nedeljama i workout-ima, upravljanje vežbama, auto-save, pretraga programa, upload slika programa

#### 3. Workout Tracking Service
- **Odgovornosti:** Praćenje startovanih programa i workout-a korisnika
- **Tehnologije:** Rust (Axum), MongoDB
- **Ključne funkcionalnosti:** Startovanje programa, praćenje workout-a u realnom vremenu, unos težine i metrika, označavanje završenih setova, pregled istorije treninga

#### 4. Analytics Service
- **Odgovornosti:** Agregacija i priprema podataka o treninzima za analitiku
- **Tehnologije:** Rust (Axum), MongoDB
- **Ključne funkcionalnosti:** Kalkulacija volumena, agregacija po mišićnim grupama, nedeljne i mesečne agregacije, priprema time series podataka za grafikone, statistike učestalosti treninga

#### API Gateway
- **Odgovornosti:** Centralna tačka pristupa, routing, autentifikacija
- **Tehnologije:** Rust (Axum)
- **Funkcionalnosti:** JWT validacija, rate limiting, request logging

### Komunikacija između servisa

Sistem koristi **API Gateway** kao centralnu tačku pristupa kroz koju prolazi sva komunikacija sa frontend-om.

**Sinhrona komunikacija (REST API):**
- Frontend → API Gateway → Mikroservisi
- Service-to-service komunikacija kada je potrebna razmena podataka

**Asinhrona komunikacija (RabbitMQ):**
- Event-driven arhitektura za background processing
- Workout Tracking Service → Analytics Service (WorkoutCompleted event)

### Baze podataka

- **PostgreSQL** (User Service) - Relaciona baza za korisnike i uloge
- **MongoDB** (Program, Workout Tracking, Analytics Services) - NoSQL baza za fleksibilne strukture

### Kontejnerizacija

- **Docker** i **Docker Compose** za kontejnerizaciju svih servisa
- Omogućava lako pokretanje, deployment i skaliranje aplikacije

### Frontend

- **Platforma:** Mobilna aplikacija (React Native sa Expo framework)
- **Odgovornost:** Renderovanje grafikona, interaktivnog modela tela, i svih UI komponenti

## Funkcionalnosti sistema

### Registracija (Neautentifikovani korisnik)
- Unos korisničkog imena i lozinke
- Izbor da li korisnik želi da bude Coach ili User

### Logovanje (Neautentifikovani korisnik)
- Unos korisničkog imena i lozinke
- Autentifikacija putem JWT tokena

### Pretraga programa (User, Coach, Admin)
- Mogućnost pretrage programa po nazivu i tagovima

### Kreiranje programa (Coach)
- Unos naziva programa i kratkog opisa
- Unosenje relevantnih tagova (npr. powerlifting, bodybuilding, strength, calisthenics)
- Upload slika programa
- Kreiranje workout-a koji su raspoređeni po nedeljama
- Unutar svakog workout-a moguće je uneti vežbu (izbor postojeće vežbe iz baze)
- Unutar svake vežbe moguće je uneti više setova
- Set se sastoji od volume metrika (reps, reps range) i intensity metrika (RPE, RIR)
- Postoji mogućnost kopiranja i pastovanja workout-a i nedelja na frontu kako bi se olakšao proces korisniku
- Na svakih minut/dva se ažurira program (auto-save)
- Ako korisnik izađe iz aplikacije i ponovo uđe, može da nastavi da edituje program
- Tek kad stisne finish program postaje vidljiv drugim korisnicima

### Brisanje programa (Coach)
- Briše se program iz baze
- Ne može više da se startuje, ali već startovani programi ostaju u sistemu

### Editovanje programa (Coach)
- Mogu se menjati sva polja
- Izmene će videti samo korisnici koji naknadno startuju program

### Startovanje programa (User)
- Startovani program je kopija template programa
- Sve je isto kao u template-u, samo se dodaje polje weight unutar seta
- Korisnik može da startuje naredni workout u tom programu

### Startovanje workout-a (User)
- Uzima se naredni workout koji je na redu iz programa
- Ili se nastavlja poslednji započeti workout ako nije markiran kao završen
- Startovani workout je isti kao workout iz programa, s tim što se dodaje polje weight u set
- Od korisnika se trazi da unese za svaki set tezinu sa kojom je radio, volumen (npr. broj ponavljanja) i intezitet
- Kad korisnik završi set, unese relevantne informacije u polja i pritisne ikonicu za završavanje seta
- Taj set se pronalazi u bazi i markira se kao done
- Kad se završi workout, dodaje se polje isFinished: true, čuva se u bazi i trigeruje se agregacija volumena u servisu za analitiku

### Istorija treninga (User)
- Korisnik ima uvid u svoju istoriju workout-a
- Podaci su grupisani po startovanim programima

### Analitike (User)
- Korisniku se prikazuju analitike volumena (sets × reps × weight)
- Volumen po svakom delu tela (interaktivni model ljudskog tela)
- Ukupan volumen
- Grafikoni progresa kroz vreme (nedeljni i mesecni prikaz)

### Uvid u napredak korisnia (Coach)
- Pregled ko je startovao njihove programe
- Uvid u napredak korisnika na programima

### Kreiranje vežbi (Admin)
- Admin može da kreira novu vežbu
- Vežba se sastoji od:
  - Naziva vežbe
  - Linka koji pokazuje kako se radi vežba
  - Koje mišiće koristi i koliko ih koristi (vrednost od 0.0 do 1.0)
  - 0.5 = umereno koristi mišić, 1.0 = taj mišić je primary mover


## Tehnologije

### Backend
- **Programski jezik:** Rust
- **Web framework:** Axum
- **Relaciona baza:** PostgreSQL
- **NoSQL baza:** MongoDB
- **Message Broker:** RabbitMQ
- **Autentifikacija:** JWT

### Frontend
- **Framework:** React Native (Expo Framework)

## Moguća proširenja (za diplomski)
- **Ocenjivanje programa:**
  - kada korisnik startuje program moze ga oceniti i ostaviti komentar
- **Ai assistant:**
  - korisnik moze da chatuje sa ai assistantom koji mu moze pomoci da pronadje zeljeni program
  - pravi se rag sistem na osnovu opisa svakog programa i tagova i prikazuje se korisniku najbolji match za njegove potrebe i potencijalno postojećih ocena programa
- **Deployment:**
  - Deployment svakog mikroservisa i baza na nekog od cloud provajdera
  - Dodavanje rate limitera
- **Plaćanje:**
  - Integracija sa nekom od platforma za plaćanje (PayPal, PayProGlobal ili neka druga)
  - Postojali bi besplatni programi i oni koji se plaćaju

