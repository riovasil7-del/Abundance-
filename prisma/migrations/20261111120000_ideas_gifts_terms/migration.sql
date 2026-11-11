-- Ideas library, content categories, gift catalog, community fund, and terms acceptance.

ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "termsVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Video" ADD COLUMN "contentCategory" TEXT;
ALTER TABLE "Video" ADD COLUMN "ideaSlug" TEXT;
ALTER TABLE "LiveSession" ADD COLUMN "contentCategory" TEXT;
ALTER TABLE "LiveSession" ADD COLUMN "ideaSlug" TEXT;

ALTER TABLE "Gift" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Gift" ADD COLUMN "destination" TEXT NOT NULL DEFAULT 'creator';

UPDATE "Gift" SET "nameSk" = 'Srdiečko', "nameEn" = 'Little heart', "priceCents" = 1, "symbol" = '❤️', "sortOrder" = 1, "destination" = 'creator', "active" = true WHERE "slug" = 'heart';
UPDATE "Gift" SET "nameSk" = 'Sviečka', "nameEn" = 'Candle', "priceCents" = 20, "symbol" = '🕯️', "sortOrder" = 4, "destination" = 'creator', "active" = true WHERE "slug" = 'candle';
UPDATE "Gift" SET "nameSk" = 'Holubica pokoja', "nameEn" = 'Dove of peace', "priceCents" = 299, "symbol" = '🕊️', "sortOrder" = 8, "destination" = 'creator', "active" = true WHERE "slug" = 'dove';
UPDATE "Gift" SET "nameSk" = 'Betlehemská hviezda', "nameEn" = 'Star of Bethlehem', "priceCents" = 2999, "symbol" = '⭐', "sortOrder" = 12, "destination" = 'creator', "active" = true WHERE "slug" = 'star';
UPDATE "Gift" SET "active" = false WHERE "slug" NOT IN ('heart', 'smile', 'flower', 'candle', 'cloud', 'feather', 'wing', 'dove', 'olive', 'rainbow', 'harp', 'star', 'lamp', 'grail', 'choir', 'gate', 'loaf', 'well');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_candle', 'candle', 'Sviečka', 'Candle', 20, '🕯️', 4, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'candle');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_heart', 'heart', 'Srdiečko', 'Little heart', 1, '❤️', 1, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'heart');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_dove', 'dove', 'Holubica pokoja', 'Dove of peace', 299, '🕊️', 8, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'dove');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_star', 'star', 'Betlehemská hviezda', 'Star of Bethlehem', 2999, '⭐', 12, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'star');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_smile', 'smile', 'Úsmev', 'Smile', 5, '😊', 2, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'smile');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_flower', 'flower', 'Kvietok', 'Flower', 10, '🌸', 3, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'flower');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_cloud', 'cloud', 'Oblačik', 'Little cloud', 50, '☁️', 5, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'cloud');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_feather', 'feather', 'Anjelské pierko', 'Angel feather', 99, '🪶', 6, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'feather');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_wing', 'wing', 'Anjelské krídielko', 'Angel wing', 199, '🪽', 7, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'wing');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_olive', 'olive', 'Olivová ratolesť', 'Olive branch', 499, '🌿', 9, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'olive');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_rainbow', 'rainbow', 'Dúha nádeje', 'Rainbow of hope', 999, '🌈', 10, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'rainbow');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_harp', 'harp', 'Harfa', 'Harp', 1999, '🎵', 11, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'harp');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_lamp', 'lamp', 'Lampa svetla', 'Lamp of light', 4999, '🏮', 13, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'lamp');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_grail', 'grail', 'Svätý grál', 'Holy grail', 9999, '🏆', 14, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'grail');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_choir', 'choir', 'Nebeský zbor', 'Heavenly choir', 19999, '👼', 15, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'choir');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_gate', 'gate', 'Nebeská brána', 'Heaven''s gate', 49999, '🌅', 16, true, 'creator'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'gate');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_loaf', 'loaf', 'Bochník chleba', 'Loaf of bread', 100, '🍞', 17, true, 'food'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'loaf');
INSERT INTO "Gift" ("id", "slug", "nameSk", "nameEn", "priceCents", "symbol", "sortOrder", "active", "destination")
SELECT 'gift_well', 'well', 'Studnička', 'A small well', 500, '💧', 18, true, 'water'
WHERE NOT EXISTS (SELECT 1 FROM "Gift" WHERE "slug" = 'well');

CREATE TABLE "FundCredit" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fund" TEXT NOT NULL,
    "netCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FundCredit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FundCredit_transactionId_key" ON "FundCredit"("transactionId");
CREATE INDEX "FundCredit_fund_idx" ON "FundCredit"("fund");
ALTER TABLE "FundCredit" ADD CONSTRAINT "FundCredit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "titleEn" TEXT,
    "descriptionEn" TEXT,
    "category" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "locale" TEXT NOT NULL DEFAULT 'sk',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Idea_slug_key" ON "Idea"("slug");
CREATE INDEX "Idea_status_category_idx" ON "Idea"("status", "category");
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IdeaSave" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdeaSave_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdeaSave_userId_ideaId_key" ON "IdeaSave"("userId", "ideaId");
CREATE INDEX "IdeaSave_userId_idx" ON "IdeaSave"("userId");
ALTER TABLE "IdeaSave" ADD CONSTRAINT "IdeaSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdeaSave" ADD CONSTRAINT "IdeaSave_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_water-for-elder', 'water-for-elder', 'Voda pre staršieho suseda', 'Donesie vedro vody a nechá ho pri dverách. Opýtate sa, či môžete vojsť.', 'Water for an older neighbour', 'Carry a bucket of water and leave it by the door. Ask before you step inside.', 'neighbours', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'water-for-elder');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_listen-twenty', 'listen-twenty', 'Dvadsať minút počúvať', 'Sadnete si k susedovi a necháte ho hovoriť. Neprerušujete a nič nenatáčate.', 'Listen for twenty minutes', 'Sit with a neighbour and let them talk. Do not interrupt, and do not film.', 'neighbours', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'listen-twenty');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_sweep-yard', 'sweep-yard', 'Pozametať spoločný dvor', 'Pozametáte dvor, ktorý používajú viacerí. Smeti odnesiete na dohodnuté miesto.', 'Sweep the shared yard', 'Sweep a yard several households share. Take the sweepings to the agreed place.', 'neighbours', 15, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'sweep-yard');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_share-portion', 'share-portion', 'Podeliť sa o porciu', 'Z vlastného hrnca odnesiete jednu misku. Nie je to prosba o peniaze.', 'Share a portion of a meal', 'Take one bowl from your own pot. It is not a request for money.', 'neighbours', 15, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'share-portion');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_walk-clinic', 'walk-clinic', 'Odprevadiť na kliniku', 'Idete pomaly s niekým, kto sa bojí cesty. Čakáte vonku, kým vás nezavolá.', 'Walk someone to the clinic', 'Walk slowly with someone who is uneasy about the road. Wait outside until they call you.', 'neighbours', 40, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'walk-clinic');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_mend-bag', 'mend-bag', 'Opraviť roztrhnutú tašku', 'Ihlou a niťou opravíte tašku, v ktorej niekto nosí nákup alebo knihy.', 'Mend a torn bag', 'With a needle and thread, mend a bag someone uses for shopping or books.', 'neighbours', 25, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'mend-bag');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_read-letter', 'read-letter', 'Prečítať list nahlas', 'Prečítate list alebo správu tomu, kto o to požiada. Obsah si necháte pre seba.', 'Read a letter aloud', 'Read a letter or message for someone who asks. You keep the contents to yourself.', 'neighbours', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'read-letter');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_check-lamp', 'check-lamp', 'Skontrolovať lampu', 'Pozriete sa, či má sused olej, sviečku alebo nabitý telefón na večer.', 'Check a lamp', 'See whether a neighbour has oil, a candle, or a charged phone for the evening.', 'neighbours', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'check-lamp');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_walk-to-school', 'walk-to-school', 'Odprevadiť mladšie deti do školy', 'Idete s nimi po známej ceste a odovzdáte ich učiteľovi. Rodič o tom vie.', 'Walk younger children to school', 'Walk a familiar road and hand them to a teacher. A parent already knows.', 'children', 25, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'walk-to-school');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_share-page', 'share-page', 'Podeliť sa o stranu zošita', 'Odtrhnete čistú stranu alebo požičiate ceruzku na jednu hodinu.', 'Share a notebook page', 'Tear out a clean page or lend a pencil for one lesson.', 'children', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'share-page');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_story-tree', 'story-tree', 'Príbeh pod stromom', 'Prečítate alebo porozprávate krátky príbeh. Deti nemusia byť na zábere.', 'A story under a tree', 'Read or tell a short story. The children do not have to be in any picture.', 'children', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'story-tree');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_mend-bench', 'mend-bench', 'Opraviť školskú lavicu', 'Utiahnete uvoľnenú lavicu alebo stoličku, aby sa na nej dalo sedieť.', 'Mend a school bench', 'Tighten a loose bench or chair so someone can sit safely.', 'children', 40, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'mend-bench');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_teach-song', 'teach-song', 'Naučiť jednu pieseň', 'Naučíte krátku pieseň, ktorú deti môžu spievať aj bez vás.', 'Teach one song', 'Teach a short song the children can sing after you leave.', 'children', 15, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'teach-song');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_homework-beside', 'homework-beside', 'Sedieť pri úlohe', 'Pomôžete s jedným príkladom. Úlohu za dieťa nenapíšete.', 'Sit beside homework', 'Help with one problem. You do not write the homework for the child.', 'children', 30, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'homework-beside');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_class-water', 'class-water', 'Voda do triedy', 'Donesiete nádobu pitnej vody, ktorú trieda môže zdieľať.', 'Water for a classroom', 'Bring a container of drinking water the class can share.', 'children', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'class-water');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_uniform-button', 'uniform-button', 'Prišiť gombík na uniformu', 'Prišijete gombík, ktorý dieťaťu chýba. Oblečenie vráti rodičovi.', 'Sew a uniform button', 'Sew a missing button. The clothes go back to the parent.', 'children', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'uniform-button');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_plant-tree', 'plant-tree', 'Zasadiť strom a poliať ho', 'Zasadíte jeden stromček na mieste, kde to miestni dovolia, a polejete ho.', 'Plant a tree and water it', 'Plant one sapling where local people allow it, and water it.', 'nature', 45, false, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'plant-tree');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_pick-plastic', 'pick-plastic', 'Pozbierať plasty z cesty', 'Pozbierate odpad z cesty k vode alebo k škole a odnesiete ho na dohodnuté miesto.', 'Pick plastic off the path', 'Pick litter from the path to the water or the school and take it to the agreed place.', 'nature', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'pick-plastic');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_mulch-bed', 'mulch-bed', 'Nastielať záhon', 'Prikrýjete pôdu suchou trávou, aby udržala vlhkosť.', 'Mulch a garden bed', 'Cover the soil with dry grass so it keeps its moisture.', 'nature', 30, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'mulch-bed');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_save-seeds', 'save-seeds', 'Odložiť semienka', 'Z odrody, ktorá sa osvedčila, odložíte semienka na ďalšiu sezónu.', 'Save seeds', 'From a variety that grew well, save seeds for the next season.', 'nature', 15, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'save-seeds');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_shade-water', 'shade-water', 'Tieň pri vode', 'Z vetiev alebo látky urobíte tieň tam, kde ľudia čakajú na vodu.', 'Shade a water point', 'With branches or cloth, make shade where people wait for water.', 'nature', 30, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'shade-water');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_compost-scraps', 'compost-scraps', 'Zvyšky do kompostu', 'Rastlinné zvyšky odnesiete na kompost, nie do vody.', 'Kitchen scraps to the compost', 'Take plant scraps to the compost, not into the water.', 'nature', 15, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'compost-scraps');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_rain-path', 'rain-path', 'Cestička pre dážď', 'Uvoľníte žliabok, aby dážď neodnášal pôdu zo záhrady.', 'A path for the rain', 'Clear a small channel so rain does not carry the garden soil away.', 'nature', 25, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'rain-path');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_name-trees', 'name-trees', 'Pomenovať stromy', 'S deťmi pomenujete stromy pri ceste. Nič nezlomíte.', 'Name the trees', 'With children, name the trees along the path. You break nothing.', 'nature', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'name-trees');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_water-bowl', 'water-bowl', 'Doplniť misku vody', 'Doplníte čistú vodu zvieraťu, ktoré ju má prázdnu.', 'Refill a water bowl', 'Refill clean water for an animal whose bowl is empty.', 'animals', 5, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'water-bowl');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_mend-pen', 'mend-pen', 'Opraviť ohradu', 'Opravíte dieru v ohrade, aby koza v noci neodišla.', 'Mend a goat pen', 'Mend a hole in the pen so a goat does not wander at night.', 'animals', 40, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'mend-pen');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_slow-donkey', 'slow-donkey', 'Viesť unaveného osla pomaly', 'Idete pomaly a nesiete časť nákladu, ak vám to majiteľ dovolí.', 'Lead a tired donkey slowly', 'Walk slowly and carry part of the load if the owner allows it.', 'animals', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'slow-donkey');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_safe-scraps', 'safe-scraps', 'Bezpečné zvyšky', 'Dáte len to, čo je pre zviera bezpečné. O soli a kostiach sa spýtate majiteľa.', 'Safe kitchen scraps', 'Give only what is safe. Ask the owner about salt and bones.', 'animals', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'safe-scraps');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_sit-with-owner', 'sit-with-owner', 'Sedieť pri chorom zvierati', 'Zostanete s človekom, ktorý sa bojí o zviera. Nesľubujete liek.', 'Sit with a sick animal''s owner', 'Stay with the person who is worried. You do not promise medicine.', 'animals', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'sit-with-owner');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_free-bird', 'free-bird', 'Vyslobodiť vtáča, ak je to bezpečné', 'Ak je vtáča zachytené a viete ho pustiť bez úrazu, pustíte ho. Inak zavoláte dospelého.', 'Free a bird if it is safe', 'If a bird is caught and you can free it without harm, you do. Otherwise you call an adult.', 'animals', 15, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'free-bird');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_shade-coop', 'shade-coop', 'Tieň pre sliepky', 'Posuniete rohož alebo vetvu tak, aby mali sliepky tieň.', 'Shade for the hens', 'Move a mat or a branch so the hens have shade.', 'animals', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'shade-coop');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_no-stones', 'no-stones', 'Žiadne kamene po zvieratách', 'Pokojne poviete deťom, že zvieratá sa nehádžu kameňmi.', 'No stones at animals', 'Quietly tell children that animals are not for throwing stones at.', 'animals', 5, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'no-stones');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_doorstep-talk', 'doorstep-talk', 'Rozhovor pri dverách', 'Sadnete si vonku a rozprávate sa s chorým, ak vás pozve. Dnu nejdete nasilu.', 'A talk at the door', 'Sit outside and talk if they invite you. You do not push inside.', 'sick', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'doorstep-talk');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_bring-porridge', 'bring-porridge', 'Zanieť kašu', 'Uvaríte jednoduchú kašu a prinesiete ju teplú. Opýtate sa, či ju chcú.', 'Bring porridge', 'Cook a simple porridge and bring it warm. Ask whether they want it.', 'sick', 25, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'bring-porridge');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_fetch-medicine', 'fetch-medicine', 'Donesť liek, o ktorý požiadali', 'Kúpite liek, ktorý už majú predpísaný, z ich peňazí. Nie je to vaša zbierka.', 'Fetch medicine they asked for', 'Buy medicine they already have prescribed, with their money. It is not your collection.', 'sick', 40, false, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'fetch-medicine');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_quiet-prayer', 'quiet-prayer', 'Ticho alebo modlitba, ak o ňu požiadajú', 'Zostanete ticho alebo sa pomodlíte ich slovami. Svoje im nevnucujete.', 'Silence or a prayer, if they ask', 'Stay quiet or pray in their words. You do not impose yours.', 'sick', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'quiet-prayer');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_song-note', 'song-note', 'Krátka pieseň na diaľku', 'Pošlete hlasovú správu s piesňou, ak telefón majú a chcú ju.', 'A short song from afar', 'Send a voice message with a song if they have a phone and want it.', 'sick', 5, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'song-note');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_wash-cup', 'wash-cup', 'Umyť pohár a nechať vodu', 'Umyjete jeden pohár a necháte pri ňom čistú vodu.', 'Wash a cup and leave water', 'Wash one cup and leave clean water beside it.', 'sick', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'wash-cup');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_shade-walk', 'shade-walk', 'Krátka prechádzka v tieni', 'Prejdete sa len tak ďaleko, ako vládze. Tempo udáva on.', 'A short walk in the shade', 'Walk only as far as they can. They set the pace.', 'sick', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'shade-walk');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_use-name', 'use-name', 'Osloviť menom', 'Pri ďalšej návšteve ich oslovíte menom, ktoré si pamätáte.', 'Use their name', 'On the next visit you use the name you remembered.', 'sick', 5, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'use-name');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_greet-by-name', 'greet-by-name', 'Pozdraviť menom', 'Zastavíte sa na jeden pozdrav a poviete meno. Nič za to nechcete.', 'Greet someone by name', 'Stop for one greeting and say their name. You want nothing in return.', 'quick', 1, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'greet-by-name');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_hold-door', 'hold-door', 'Podržať dvere', 'Podržíte dvere človeku, ktorý nesie niečo ťažké.', 'Hold a door', 'Hold the door for someone carrying something heavy.', 'quick', 1, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'hold-door');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_one-piece', 'one-piece', 'Jedno smeti z cesty', 'Zdvihnete jeden kus odpadu, ktorý vám leží v ceste.', 'One piece of litter', 'Pick up one piece of litter that is in your way.', 'quick', 3, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'one-piece');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_thought-of-you', 'thought-of-you', 'Napísať: myslel som na teba', 'Pošlete krátku správu bez žiadosti o odpoveď.', 'Write: I thought of you', 'Send a short message that does not ask for a reply.', 'quick', 2, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'thought-of-you');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_share-seat', 'share-seat', 'Uvoľniť miesto', 'Uvoľníte miesto niekomu, kto stojí unavený.', 'Offer a seat', 'Give your seat to someone who is standing and tired.', 'quick', 1, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'share-seat');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_return-pencil', 'return-pencil', 'Vrátiť nájdenú ceruzku', 'Ceruzku alebo pero vrátite tomu, komu patrí.', 'Return a found pencil', 'Return a pencil or pen to the person it belongs to.', 'quick', 2, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'return-pencil');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_thank-cook', 'thank-cook', 'Poďakovať tomu, kto varil', 'Poviete ďakujem pri jedle. Nie je to prejav na kameru.', 'Thank the person who cooked', 'Say thank you at the meal. It is not a performance for a camera.', 'quick', 1, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'thank-cook');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_let-them-first', 'let-them-first', 'Nechať niekoho ísť prvého', 'Vo fronte na vodu alebo chlieb pustíte dopredu staršieho alebo unaveného.', 'Let someone go first', 'In the line for water or bread, you let an older or tired person go ahead.', 'quick', 1, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'let-them-first');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_cook-with-child', 'cook-with-child', 'Variť s dieťaťom', 'Dieťa mieša alebo umýva jednu vec. Oheň držíte vy.', 'Cook with a child', 'A child stirs or washes one thing. You keep the fire.', 'family', 30, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'cook-with-child');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_grandparent-story', 'grandparent-story', 'Príbeh starkého alebo starkej', 'Necháte staršieho človeka porozprávať jeden príbeh z ich mladosti.', 'A grandparent''s story', 'Let an older person tell one story from when they were young.', 'family', 15, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'grandparent-story');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_wash-together', 'wash-together', 'Umývať riad spolu', 'Jeden umýva, druhý utiera. Nikto pri tom nikoho nezosmiešňuje.', 'Wash dishes together', 'One washes, one dries. Nobody is mocked for it.', 'family', 15, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'wash-together');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_mend-shirt', 'mend-shirt', 'Opraviť košeľu', 'Zašijete roztrhnuté miesto na košeli, ktorú niekto ešte nosí.', 'Mend a shirt', 'Sew a tear in a shirt someone still wears.', 'family', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'mend-shirt');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_meal-without-phone', 'meal-without-phone', 'Jedno jedlo bez telefónu', 'Počas jedla odložíte telefón. Rozprávate sa o tom, čo bolo dnes dobré.', 'One meal without a phone', 'Put the phone away for the meal. Talk about one good thing from the day.', 'family', 30, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'meal-without-phone');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_walk-after-supper', 'walk-after-supper', 'Prechádzka po večeri', 'Prejdete sa okolo domu. Tempo udáva najpomalší.', 'A walk after supper', 'Walk around the house. The slowest person sets the pace.', 'family', 20, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'walk-after-supper');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_forgive-aloud', 'forgive-aloud', 'Odpustiť malú vec nahlas', 'Poviete, že tá malá nepríjemnosť je odpustená. Nežiadate verejné ospravedlnenie.', 'Forgive a small thing out loud', 'Say that a small irritation is forgiven. You do not demand a public apology.', 'family', 5, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'forgive-aloud');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_water-tomorrow', 'water-tomorrow', 'Voda na zajtra', 'Spoločne naplníte nádobu, ktorú budete potrebovať ráno.', 'Water for tomorrow', 'Together, fill the container you will need in the morning.', 'family', 15, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'water-tomorrow');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_sing-while-work', 'sing-while-work', 'Spievať pri práci', 'Spievate pri umývaní alebo zametaní. Kto nechce, nemusí sa pridať.', 'Sing while you work', 'Sing while washing or sweeping. Anyone who does not want to can stay quiet.', 'mood', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'sing-while-work');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_one-dance-step', 'one-dance-step', 'Jeden tanečný krok', 'Naučíte jeden krok niekoho, kto o to požiada. Nie je to súťaž.', 'One dance step', 'Teach one step to someone who asks. It is not a contest.', 'mood', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'one-dance-step');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_kind-joke', 'kind-joke', 'Vtip, ktorý nikoho neponíži', 'Poviete vtip, v ktorom nikto nie je terčom posmechu.', 'A joke that shames no one', 'Tell a joke in which nobody is the target.', 'mood', 5, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'kind-joke');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_clap-small', 'clap-small', 'Zatlieskať malej veci', 'Zatlieskate, keď sa niekomu podarí malá vec. Bez rebríčka.', 'Clap for a small success', 'Clap when someone manages a small thing. There is no ranking.', 'mood', 2, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'clap-small');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_draw-dust', 'draw-dust', 'Kresba do prachu', 'Nakreslíte niečo pekné tam, kde to vietor môže zasa zmyť.', 'A drawing in the dust', 'Draw something kind where the wind can wash it away again.', 'mood', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'draw-dust');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_swap-recipe', 'swap-recipe', 'Vymeniť si recept', 'Poviete, ako varíte jednu jednoduchú vec, a vypočujete si ich spôsob.', 'Swap a recipe', 'Tell how you cook one simple thing, and listen to their way.', 'mood', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'swap-recipe');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_name-one-good', 'name-one-good', 'Pri západe slnka jedna dobrá vec', 'Pri západe slnka pomenujete jednu dobrú vec z dňa.', 'One good thing at sunset', 'At sunset, name one good thing from the day.', 'mood', 10, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'name-one-good');
INSERT INTO "Idea" ("id", "slug", "title", "description", "titleEn", "descriptionEn", "category", "estimatedMinutes", "isFree", "locale", "status")
SELECT 'idea_one-kind-sentence', 'one-kind-sentence', 'Jedna láskavá veta', 'Napíšete alebo poviete jednu vetu, ktorá niekoho poteší a nikoho nezosmiešni.', 'One kind sentence', 'Write or say one sentence that cheers someone and mocks nobody.', 'mood', 5, true, 'sk', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM "Idea" WHERE "slug" = 'one-kind-sentence');
