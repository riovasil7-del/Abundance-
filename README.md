# Hojnosť

Pracovný názov. Celá aplikácia ho číta z jednej konštanty `APP_NAME` v súbore `src/config/app.ts`. Premenovanie znamená zmeniť túto konštantu (a znova spustiť aplikáciu). Manifest PWA, titulok stránky aj hlavička idú odtiaľ.

Hojnosť je spoločenstvo krátkych videí dobrých skutkov, remesiel, piesní a vďaky. Podporovatelia posielajú dary tvorcom. Nie sú tu súboje, rebríčky ani mechaniky, ktoré niekoho zahanbia. Namiesto nich sú **kruhy požehnania**: spoločná výzva, v ktorej dar ide všetkým overeným účastníkom naraz a každý vyhráva.

Veta, ktorou sa spoločenstvo predstavuje: **Sme z jednej matky a jedného Boha.** Rozhranie je medzináboženské a od začiatku v slovenčine a angličtine. Svahilčina sa pridá ako ďalší slovník.

## Ako to spustiť

Potrebujete Node.js 20+ a PostgreSQL 16.

```bash
cp .env.example .env
# upravte DATABASE_URL a AUTH_SECRET

npm install
npx prisma migrate deploy
npm run db:seed
npm test
npm run dev
```

Aplikácia beží na [http://localhost:3000](http://localhost:3000).

Databázu viete zdvihnúť aj cez Docker:

```bash
docker compose up -d
```

Bez Dockeru, na Ubuntu s lokálnym PostgreSQL 16:

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE USER hojnost WITH PASSWORD 'hojnost' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE hojnost OWNER hojnost;"
```

Produkčný beh:

```bash
npm run build
npm start
```

### Ukážkové účty

Heslo pre všetky: `DobrySkutok-1`

| E-mail | Rola |
| --- | --- |
| elena@hojnost.local | podporovateľka |
| amina@hojnost.local | tvorkyňa, Nairobi, overená |
| joseph@hojnost.local | tvorca, Kisumu, overený |
| grace@hojnost.local | tvorkyňa, Mombasa, overená |
| daniel@hojnost.local | tvorca, čaká na overenie |
| admin@hojnost.local | správca |
| mod@hojnost.local | moderátor |

Na prihlásení sú tlačidlá, ktoré tieto účty vyplnia. Sú to semienka na vyskúšanie, nie zadné vrátka.

## Pravidlo 15 / 85

Každá darcovská transakcia sa delí na serveri, v celých centoch:

- **15 %** ostáva platforme (spoločnosť a servery),
- **85 %** je zapísaných tvorcovi.

Konštanty sú `PLATFORM_FEE = 0.15` a zlomok `15 / 100` v `src/config/app.ts`. Jediný výpočet je `splitDonation()` v `src/server/fees.ts`. Násobenie plávajúcou desatinnou čiarkou sa na peniaze nepoužíva. Zaokrúhlenie je half-up: poplatok z 10 centov (1,5 centu) je 2 centy. Súčet poplatku a čistej sumy sa vždy rovná hrubej sume. V databáze to isté drží kontrola `ledger_conserves_cents`.

Cenu daru server načíta z katalógu. Telo požiadavky sumu neobsahuje. Ak ju klient pošle, schéma ju zahodí.

Pri kruhu sa 15 % vezme raz z celého daru a 85 % sa rozdelí rovným dielom medzi **overených** účastníkov. Zvyšné centy dostanú tí, ktorí sa pridali skôr. Neoverený účastník je v kruhu vidieť, ale podiel zatiaľ nemá.

Peňaženka drží hrubú sumu, poplatok aj čistú sumu pri každom pohybe. Čistá suma je v držbe `PAYOUT_HOLD_DAYS` (predvolene 7 dní), kým sa nedá vyplatiť.

Testy:

```bash
npm test
```

Pokryté sú presný podiel 15/85, hraničné zaokrúhlenie, invariant pre 0 až 20 000 centov, odmietnutie záporných a necelých súm, ignorovanie klientskej sumy a rovnomerné delenie kruhu.

## Čo prvá verzia vie

- Registrácia a prihlásenie e-mailom a heslom. Telefón je pripravené pole. Roly: podporovateľ, tvorca, moderátor, správca.
- Jeden účet na človeka zatiaľ drží unikátny e-mail a unikátny telefón. Pole `kycSubjectId` čaká na poskytovateľa totožnosti.
- Profily tvorcov, overenie (`UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED`) a pripravené polia pre Stripe Connect aj KYC.
- Zvislý kanál videí. Na pomalej sieti sa sťahuje len aktuálne video a to nasledujúce. Požehnania namiesto lajkov. Komentáre prechádzajú filtrom láskavosti a dajú sa nahlásiť.
- Katalóg darov: sviečka, chlieb, holubica, srdce, hviezda. Anonymný dar (meno sa skryje, účtovný záznam ostáva). Reťaz dobra: dar sa dá nadviazať na predchádzajúci.
- Mesačná „rodina“ v troch pevných sumách. Prvý mesiac sa zapíše hneď. Ďalšie strhnutia čakajú na platobnú bránu.
- Kruhy požehnania: vytvorenie, pripojenie, videá skutkov, dar rozdelený po poplatku.
- Peňaženka tvorcu (k dispozícii / v držbe) a prehľad darov, ktoré podporovateľ poslal.
- Nahrávanie videa cez rozhranie úložiska. Predvolene lokálny disk (`storage/uploads`, servírované cez `/api/media/...`). Prepínač `VIDEO_STORAGE` pozná `cloudflare-stream` a `mux`; tie zatiaľ úmyselne odmietnu zápis, kým nebudú kľúče.
- Moderovanie: nahlásenia, zadržané komentáre, skrytie videa, overenie tvorcu, denník zmien.
- Pravidlá obsahu: bez žobrania, bez poníženia, súhlas nakrútených ľudí a osobitne detí. Bez zaškrtnutia súhlasu sa video nezverejní.
- Jednoduché limity požiadaviek (prihlásenie, komentáre, dary, nahlásenia, nahrávanie).
- PWA manifest. Názov ide z `APP_NAME`.
- Jazyk SK / EN, prepínač v hlavičke. Slovníky sú `src/i18n/sk.ts` a `src/i18n/en.ts`.

## Čo je zatiaľ len rozhranie

**Platby.** Bez `STRIPE_SECRET_KEY` beží označený testovací režim: dar sa zapíše do účtovnej knihy, peniaze reálne nejdú. S kľúčom server vytvorí Stripe PaymentIntent na hrubú sumu. Ak má tvorca `stripeAccountId`, použije sa `application_fee_amount` (15 %) a `transfer_data` (Stripe Connect). Kruh má viac príjemcov, preto ostáva na účte platformy a delenie je v knihe — Connect vypláca jednému účtu. Webhook je `POST /api/stripe/webhook`. Suma z udalosti sa porovná s riadkom v knihe. Kým webhook platbu nepotvrdí, stav je `PENDING` a do peňaženky sa nepočíta.

**Výplaty.** `src/server/payouts.ts` má rozhranie pre M-Pesa, Flutterwave, Paystack a Stripe Connect. Predvolená implementácia žiadosť len uloží ako `STUBBED` a zostatok nestrhne, lebo peniaze neodišli.

**Živé vysielanie.** `src/server/live.ts` vie založiť stub miestnosť. LiveKit je pripravený ako trieda, ktorá bez konfigurácie odmietne spojenie. Agora a Mux sa napoja na to isté rozhranie. Plné vysielanie v tejto verzii nie je.

**KYC.** Stav overenia a polia `kycProvider`, `kycReference`, `kycSubjectId` sú v schéme. Smile ID ani iný poskytovateľ nie je pripojený. Overenie v administrácii je ručné.

**Opakovaná rodina.** `nextChargeAt` sa zapíše. Plánovač, ktorý by ďalší mesiac strhol platbu, zatiaľ nie je.

**Limity požiadaviek** sú v pamäti jedného procesu. Na viac serverov treba Redis za tým istým rozhraním.

**Ukážkové videá** sú krátke teplé klipy s menom, nie zábery skutočných ľudí. Nahraté súbory idú cez úložné rozhranie.

## Ďalšie kroky

1. **Právny subjekt** a jasné podmienky: kto je platforma, ako sa účtuje 15 %, dane, ochrana darcov aj tvorcov, pravidlá pre obsah s deťmi.
2. **Stripe v ostrej prevádzke:** live kľúče, webhook, Stripe Connect účty tvorcov, prípadne samostatný účet pre kruhy.
3. **Výplaty** do Kene: M-Pesa, Flutterwave alebo Paystack. Až potom sa zostatok po držbe smie odpísať.
4. **KYC** (napríklad Smile ID), aby jeden človek naozaj znamenal jeden účet a výplata šla overenému tvorcovi.
5. **Poskytovateľ videa a živého vysielania** (Cloudflare Stream, Mux, LiveKit alebo Agora), keď lokálny disk prestane stačiť.
6. **Svahilčina:** súbor `src/i18n/sw.ts` podľa typu `Messages`, pridať `"sw"` do `LOCALES`.
7. **Plánovač** mesačnej rodiny a uvoľnenia držby (dnes sa držba počíta pri čítaní peňaženky).

## Ako je to poskladané

Next.js (App Router), TypeScript, PostgreSQL, Prisma. Rozhranie je mobilné, svetlé, v odtieňoch papiera, zlata a oblohy. Má bežať v prehliadači telefónu, aj slabšieho, a neskôr sa dá zabaliť ako PWA alebo preniesť na natívneho klienta. Serverové moduly peňazí, platieb, výplat, úložiska a živého vysielania sú oddelené, aby sa dali vymeniť bez prepisovania obrazoviek.
