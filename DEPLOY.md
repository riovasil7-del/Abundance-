# Ako dať Hojnosť na internet

Tento návod je pre Ria. Netreba vedieť programovať. Každý krok je kliknutie alebo skopírovanie textu. Účty nižšie majú bezplatnú verziu, ktorá na prvé spustenie stačí.

Kód je v GitHube. Aplikácia sa volá Hojnosť. Dary fungujú aj bez Stripe: je to ukážkový režim, ale rozdelenie 15 % platforma / 85 % tvorca sa počíta na serveri rovnako ako pri ostrej platbe.

Keď niečo z živého vysielania ešte nemáte, stránka povie „Živé vysielanie ešte nie je zapnuté“ a ostatné časti bežia ďalej.

## 0. Čo si pripravíte

Štyri bezplatné účty. Zakladajte ich v tomto poradí, lebo ďalší krok vždy potrebuje údaj z predchádzajúceho.

1. [GitHub](https://github.com) — kód už tam je.
2. [Neon](https://neon.tech) — databáza (zosbierané dary, účty, videá v zozname).
3. [Vercel](https://vercel.com) — miesto, kde stránka beží. Prihláste sa tlačidlom „Continue with GitHub“.
4. [LiveKit Cloud](https://cloud.livekit.io) — živé vysielanie z telefónu. Tento účet môžete doplniť aj neskôr.
5. Úložisko videí. Najjednoduchšie je **Vercel Blob** (vznikne priamo vo Verceli). Druhá možnosť je [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/).

Na papier alebo do poznámok si pripravte dlhú vetu, ktorú nikomu nepošlete. Bude to `AUTH_SECRET`. Napríklad náhodné slová za sebou, aspoň 30 znakov.

## 1. Databáza na Neone

1. Otvorte [console.neon.tech](https://console.neon.tech) a vytvorte projekt. Meno môže byť `hojnost`. Región vyberte najbližší k ľuďom, ktorí budú stránku otvárať.
2. Neon ukáže connection string. Potrebujete **dva**:
   - **Pooled** (v texte je slovo `pooler`) — to bude `DATABASE_URL`.
   - **Direct** (bez slova pooler) — to bude `DIRECT_URL`.
3. Oba reťazce vyzerajú ako `postgresql://...`. Skopírujte ich celé, vrátane hesla. Nikam ich nevkladajte okrem Vercelu.

Ak Neon ponúkne len jeden reťazec, v detaile projektu otvorte „Connection details“ a prepnite „Pooled connection“. Direct je ten druhý prepínač.

## 2. Projekt na Verceli

1. Otvorte [vercel.com/new](https://vercel.com/new).
2. Vyberte repozitár s týmto kódom.
3. Vetva: `main`, keď je tam už táto verzia. Kým nie je zlúčená, môžete dočasne zvoliť vetvu `cursor/hojnost-mvp-10a3`.
4. Framework nechajte Next.js. Príkaz na zostavenie je v súbore `vercel.json` a netreba ho prepisovať. Pri zostavení sa sama doplní štruktúra databázy (`prisma migrate deploy`).
5. Ešte **nemačkajte Deploy**. Najprv premenné v ďalšom kroku. Ak ste už Deploy stlačili a spadol, nič sa nedeje: doplňte premenné a dajte Redeploy.

## 3. Premenné, ktoré vložíte do Vercelu

V projekte: **Settings → Environment Variables**. Pri každej premennej zaškrtnite Production (a Preview, ak chcete skúšobnú adresu).

Vložte presne tieto mená. Hodnotu prilepte bez úvodzoviek.

| Meno | Čo tam dať |
| --- | --- |
| `DATABASE_URL` | pooled reťazec z Neonu |
| `DIRECT_URL` | direct reťazec z Neonu |
| `AUTH_SECRET` | vaša dlhá tajná veta |
| `SEED_SECRET` | iná tajná veta, aspoň 8 znakov. Po naplnení ukážky ju môžete zmazať. |
| `VIDEO_STORAGE` | `vercel-blob` (alebo `r2`, ak idete cestou Cloudflare nižšie) |
| `BLOB_READ_WRITE_TOKEN` | token z kroku 4, ak používate Vercel Blob |
| `STRIPE_SECRET_KEY` | nechajte prázdne |
| `STRIPE_WEBHOOK_SECRET` | nechajte prázdne |
| `PAYOUT_HOLD_DAYS` | `7` |
| `NEXT_PUBLIC_APP_URL` | zatiaľ nechajte prázdne. Po prvom nasadení sem dajte adresu, ktorú Vercel ukáže, napríklad `https://hojnost.vercel.app`, a dajte Redeploy. |
| `LIVEKIT_URL` | z kroku 5, tvar `wss://niečo.livekit.cloud`. Kým LiveKit nemáte, premennú nepridávajte. |
| `LIVEKIT_API_KEY` | z kroku 5 |
| `LIVEKIT_API_SECRET` | z kroku 5 |

Prázdny Stripe je v poriadku. Peňaženka potom predá svetielka jedným ťuknutím (ukážkový režim) a dar sa strhne z nich. Na obrazovke ostáva 15 % a 85 %.

Keď Stripe kľúče vyplníte, nákup balíčka ide cez Stripe Checkout. Svetielka sa pripíšu až po zaplatení, na existujúcej adrese webhooku `https://vaša-doména/api/stripe/webhook`. V Stripe dashboarde pri tejto adrese zapnite udalosti `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded` a `charge.dispute.created`. Opakovaná udalosť svetielka nepripíše druhý raz. Vrátenie a spor nestrhnú tvorcovi dostupný zostatok pod nulu. Novú premennú prostredia netreba. `STRIPE_WEBHOOK_SECRET` je ten istý podpis, ktorý už tabuľka vyššie spomína.

## 4. Kam sa ukladajú videá

Vercel si súbory na disku neponechá. Preto sa nahraté video musí uložiť inde. Vyberte jednu cestu.

### Cesta A — Vercel Blob (menej účtov)

1. V projekte na Verceli otvorte **Storage → Create → Blob**.
2. Po vytvorení otvorte `.env.local` alebo prehľad tokenu a skopírujte `BLOB_READ_WRITE_TOKEN`.
3. V Environment Variables ho vložte pod tým menom.
4. `VIDEO_STORAGE` nastavte na `vercel-blob`.

### Cesta B — Cloudflare R2

1. V Cloudflare vytvorte bucket, napríklad `hojnost-video`.
2. V nastavení bucketu zapnite verejný prístup na čítanie (r2.dev alebo vlastná doména) a skopírujte verejnú adresu. To je `S3_PUBLIC_URL`, bez lomky na konci.
3. V R2 → Manage API tokens vytvorte token, ktorý smie zapisovať do tohto bucketu. Dostanete Access Key ID a Secret.
4. Do Vercelu vložte:

| Meno | Hodnota |
| --- | --- |
| `VIDEO_STORAGE` | `r2` |
| `S3_ENDPOINT` | adresa z R2, tvar `https://účet.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | meno bucketu |
| `S3_ACCESS_KEY_ID` | z tokenu |
| `S3_SECRET_ACCESS_KEY` | z tokenu |
| `S3_PUBLIC_URL` | verejná adresa, napríklad `https://pub-xxxx.r2.dev` |

`BLOB_READ_WRITE_TOKEN` pri tejto ceste nepotrebujete.

## 5. LiveKit (živé vysielanie)

Toto môžete urobiť až keď stránka inak beží.

1. Otvorte [cloud.livekit.io](https://cloud.livekit.io) a vytvorte projekt.
2. V projekte nájdite **URL**, **API key** a **API secret**.
3. URL musí začínať `wss://`. Príklad: `wss://hojnost-xxxx.livekit.cloud`.
4. Vložte ich do Vercelu ako `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
5. Redeploy.

Tvorca potom v telefóne otvorí svoj profil a stlačí „Ísť naživo“. Prehliadač si vypýta kameru a mikrofón. Divák otvorí odkaz „Naživo“. V izbe je rozhovor (drzé slová sa zadržia) a dar, ktorý ide cez to isté pravidlo 15/85.

Kruh požehnania má tlačidlo „Živé požehnanie kruhu“. Viacerí tvorcovia sú v jednej izbe. Nie je tam súboj ani poradie. Dar sa po poplatku delí medzi overených.

Na pomalom pripojení je v izbe tlačidlo „Len zvuk“. Obraz ide v niekoľkých veľkostiach (simulcast) a prehliadač si berie menší, keď je sieť slabá.

Kým tri LiveKit premenné nie sú vyplnené, tlačidlo nič nerozbije. Ukáže vetu, že živé vysielanie ešte nie je zapnuté.

## 6. Nasadiť

1. **Deploy** (alebo Redeploy, ak prvé kolo spadlo na chýbajúcej databáze).
2. Počkajte, kým je stav Ready.
3. Otvorte adresu, ktorú Vercel ukáže. Mala by sa načítať svetlú stránku Hojnosť, aj keď je zatiaľ prázdna.
4. Skopírujte tú adresu do `NEXT_PUBLIC_APP_URL` a dajte ešte jeden Redeploy.

## 7. Ukážkové údaje

1. Otvorte `https://vaša-adresa.vercel.app/setup`.
2. Do poľa vložte presne tú vetu, ktorú ste dali do `SEED_SECRET`.
3. Stlačte „Naplniť ukážku“.
4. Stránka napíše, že ukážka je v databáze. Druhýkrát napíše, že databáza už nie je prázdna a nič nemaže.
5. Prihlásenie: heslo pre všetky ukážkové účty je `DobrySkutok-1`.

| E-mail | Kto |
| --- | --- |
| elena@hojnost.local | podporovateľka, vie poslať dar |
| amina@hojnost.local | tvorkyňa, vie ísť naživo a vidí peňaženku |
| admin@hojnost.local | správca |

Keď je ukážka vnútri, `SEED_SECRET` vo Verceli zmažte a dajte Redeploy. Stránka `/setup` potom naplnenie odmietne.

## 8. Rýchla skúška na telefóne

1. Otvorte adresu. Má ísť kanál videí.
2. Prihláste Elenu a pošlite sviečku. Má sa ukázať 1,00 USD, poplatok 0,15 USD a tvorca 0,85 USD.
3. Odhláste sa, prihláste Aminu, otvorte Peňaženku. Má vidieť čistých 85 %.
4. Ak je LiveKit doplnený: Amina stlačí „Ísť naživo“, povolí kameru. Elena v druhom telefóne alebo okne otvorí „Naživo“ a pošle dar naživo.

## 9. Čo zatiaľ nerobiť

- Nestrihajte ostrý Stripe, kým nie je právny subjekt a živé kľúče. Prázdne polia sú správny stav.
- Výplaty do M-Pesa, Flutterwave a Paystack sú pripravené ako záznam. Peniaze sa neodosielajú.
- Overenie totožnosti tvorcu je v administrácii ručné, kým sa nenapojí poskytovateľ.

## Keď nasadenie spadne

- V logu je `DATABASE_URL` alebo `DIRECT_URL`: jeden z reťazcov z Neonu chýba alebo je v zlom poli. Pooled patrí do `DATABASE_URL`.
- V logu je Blob alebo `STORAGE_NOT_CONFIGURED`: `VIDEO_STORAGE` je `vercel-blob` alebo `r2`, ale chýba token alebo kľúč.
- Stránka žije, živé tlačidlo píše, že nie je zapnuté: chýba niektorá z troch LiveKit premenných. To nie je porucha darov.
