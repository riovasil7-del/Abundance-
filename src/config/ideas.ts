import type { IdeaCategory } from "./app";

export type IdeaSeed = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  category: IdeaCategory;
  minutes: number;
  isFree: boolean;
};

function idea(
  slug: string,
  category: IdeaCategory,
  minutes: number,
  isFree: boolean,
  title: string,
  titleEn: string,
  description: string,
  descriptionEn: string,
): IdeaSeed {
  return { slug, category, minutes, isFree, title, titleEn, description, descriptionEn };
}

/** Practical deeds for African communities and for anywhere else. Video is never required. */
export const IDEA_SEED: readonly IdeaSeed[] = [
  idea("water-for-elder", "neighbours", 20, true, "Voda pre staršieho suseda", "Water for an older neighbour", "Donesie vedro vody a nechá ho pri dverách. Opýtate sa, či môžete vojsť.", "Carry a bucket of water and leave it by the door. Ask before you step inside."),
  idea("listen-twenty", "neighbours", 20, true, "Dvadsať minút počúvať", "Listen for twenty minutes", "Sadnete si k susedovi a necháte ho hovoriť. Neprerušujete a nič nenatáčate.", "Sit with a neighbour and let them talk. Do not interrupt, and do not film."),
  idea("sweep-yard", "neighbours", 15, true, "Pozametať spoločný dvor", "Sweep the shared yard", "Pozametáte dvor, ktorý používajú viacerí. Smeti odnesiete na dohodnuté miesto.", "Sweep a yard several households share. Take the sweepings to the agreed place."),
  idea("share-portion", "neighbours", 15, true, "Podeliť sa o porciu", "Share a portion of a meal", "Z vlastného hrnca odnesiete jednu misku. Nie je to prosba o peniaze.", "Take one bowl from your own pot. It is not a request for money."),
  idea("walk-clinic", "neighbours", 40, true, "Odprevadiť na kliniku", "Walk someone to the clinic", "Idete pomaly s niekým, kto sa bojí cesty. Čakáte vonku, kým vás nezavolá.", "Walk slowly with someone who is uneasy about the road. Wait outside until they call you."),
  idea("mend-bag", "neighbours", 25, true, "Opraviť roztrhnutú tašku", "Mend a torn bag", "Ihlou a niťou opravíte tašku, v ktorej niekto nosí nákup alebo knihy.", "With a needle and thread, mend a bag someone uses for shopping or books."),
  idea("read-letter", "neighbours", 10, true, "Prečítať list nahlas", "Read a letter aloud", "Prečítate list alebo správu tomu, kto o to požiada. Obsah si necháte pre seba.", "Read a letter or message for someone who asks. You keep the contents to yourself."),
  idea("check-lamp", "neighbours", 10, true, "Skontrolovať lampu", "Check a lamp", "Pozriete sa, či má sused olej, sviečku alebo nabitý telefón na večer.", "See whether a neighbour has oil, a candle, or a charged phone for the evening."),
  idea("walk-to-school", "children", 25, true, "Odprevadiť mladšie deti do školy", "Walk younger children to school", "Idete s nimi po známej ceste a odovzdáte ich učiteľovi. Rodič o tom vie.", "Walk a familiar road and hand them to a teacher. A parent already knows."),
  idea("share-page", "children", 10, true, "Podeliť sa o stranu zošita", "Share a notebook page", "Odtrhnete čistú stranu alebo požičiate ceruzku na jednu hodinu.", "Tear out a clean page or lend a pencil for one lesson."),
  idea("story-tree", "children", 20, true, "Príbeh pod stromom", "A story under a tree", "Prečítate alebo porozprávate krátky príbeh. Deti nemusia byť na zábere.", "Read or tell a short story. The children do not have to be in any picture."),
  idea("mend-bench", "children", 40, true, "Opraviť školskú lavicu", "Mend a school bench", "Utiahnete uvoľnenú lavicu alebo stoličku, aby sa na nej dalo sedieť.", "Tighten a loose bench or chair so someone can sit safely."),
  idea("teach-song", "children", 15, true, "Naučiť jednu pieseň", "Teach one song", "Naučíte krátku pieseň, ktorú deti môžu spievať aj bez vás.", "Teach a short song the children can sing after you leave."),
  idea("homework-beside", "children", 30, true, "Sedieť pri úlohe", "Sit beside homework", "Pomôžete s jedným príkladom. Úlohu za dieťa nenapíšete.", "Help with one problem. You do not write the homework for the child."),
  idea("class-water", "children", 20, true, "Voda do triedy", "Water for a classroom", "Donesiete nádobu pitnej vody, ktorú trieda môže zdieľať.", "Bring a container of drinking water the class can share."),
  idea("uniform-button", "children", 10, true, "Prišiť gombík na uniformu", "Sew a uniform button", "Prišijete gombík, ktorý dieťaťu chýba. Oblečenie vráti rodičovi.", "Sew a missing button. The clothes go back to the parent."),
  idea("plant-tree", "nature", 45, false, "Zasadiť strom a poliať ho", "Plant a tree and water it", "Zasadíte jeden stromček na mieste, kde to miestni dovolia, a polejete ho.", "Plant one sapling where local people allow it, and water it."),
  idea("pick-plastic", "nature", 20, true, "Pozbierať plasty z cesty", "Pick plastic off the path", "Pozbierate odpad z cesty k vode alebo k škole a odnesiete ho na dohodnuté miesto.", "Pick litter from the path to the water or the school and take it to the agreed place."),
  idea("mulch-bed", "nature", 30, true, "Nastielať záhon", "Mulch a garden bed", "Prikrýjete pôdu suchou trávou, aby udržala vlhkosť.", "Cover the soil with dry grass so it keeps its moisture."),
  idea("save-seeds", "nature", 15, true, "Odložiť semienka", "Save seeds", "Z odrody, ktorá sa osvedčila, odložíte semienka na ďalšiu sezónu.", "From a variety that grew well, save seeds for the next season."),
  idea("shade-water", "nature", 30, true, "Tieň pri vode", "Shade a water point", "Z vetiev alebo látky urobíte tieň tam, kde ľudia čakajú na vodu.", "With branches or cloth, make shade where people wait for water."),
  idea("compost-scraps", "nature", 15, true, "Zvyšky do kompostu", "Kitchen scraps to the compost", "Rastlinné zvyšky odnesiete na kompost, nie do vody.", "Take plant scraps to the compost, not into the water."),
  idea("rain-path", "nature", 25, true, "Cestička pre dážď", "A path for the rain", "Uvoľníte žliabok, aby dážď neodnášal pôdu zo záhrady.", "Clear a small channel so rain does not carry the garden soil away."),
  idea("name-trees", "nature", 20, true, "Pomenovať stromy", "Name the trees", "S deťmi pomenujete stromy pri ceste. Nič nezlomíte.", "With children, name the trees along the path. You break nothing."),
  idea("water-bowl", "animals", 5, true, "Doplniť misku vody", "Refill a water bowl", "Doplníte čistú vodu zvieraťu, ktoré ju má prázdnu.", "Refill clean water for an animal whose bowl is empty."),
  idea("mend-pen", "animals", 40, true, "Opraviť ohradu", "Mend a goat pen", "Opravíte dieru v ohrade, aby koza v noci neodišla.", "Mend a hole in the pen so a goat does not wander at night."),
  idea("slow-donkey", "animals", 20, true, "Viesť unaveného osla pomaly", "Lead a tired donkey slowly", "Idete pomaly a nesiete časť nákladu, ak vám to majiteľ dovolí.", "Walk slowly and carry part of the load if the owner allows it."),
  idea("safe-scraps", "animals", 10, true, "Bezpečné zvyšky", "Safe kitchen scraps", "Dáte len to, čo je pre zviera bezpečné. O soli a kostiach sa spýtate majiteľa.", "Give only what is safe. Ask the owner about salt and bones."),
  idea("sit-with-owner", "animals", 20, true, "Sedieť pri chorom zvierati", "Sit with a sick animal's owner", "Zostanete s človekom, ktorý sa bojí o zviera. Nesľubujete liek.", "Stay with the person who is worried. You do not promise medicine."),
  idea("free-bird", "animals", 15, true, "Vyslobodiť vtáča, ak je to bezpečné", "Free a bird if it is safe", "Ak je vtáča zachytené a viete ho pustiť bez úrazu, pustíte ho. Inak zavoláte dospelého.", "If a bird is caught and you can free it without harm, you do. Otherwise you call an adult."),
  idea("shade-coop", "animals", 20, true, "Tieň pre sliepky", "Shade for the hens", "Posuniete rohož alebo vetvu tak, aby mali sliepky tieň.", "Move a mat or a branch so the hens have shade."),
  idea("no-stones", "animals", 5, true, "Žiadne kamene po zvieratách", "No stones at animals", "Pokojne poviete deťom, že zvieratá sa nehádžu kameňmi.", "Quietly tell children that animals are not for throwing stones at."),
  idea("doorstep-talk", "sick", 20, true, "Rozhovor pri dverách", "A talk at the door", "Sadnete si vonku a rozprávate sa s chorým, ak vás pozve. Dnu nejdete nasilu.", "Sit outside and talk if they invite you. You do not push inside."),
  idea("bring-porridge", "sick", 25, true, "Zanieť kašu", "Bring porridge", "Uvaríte jednoduchú kašu a prinesiete ju teplú. Opýtate sa, či ju chcú.", "Cook a simple porridge and bring it warm. Ask whether they want it."),
  idea("fetch-medicine", "sick", 40, false, "Donesť liek, o ktorý požiadali", "Fetch medicine they asked for", "Kúpite liek, ktorý už majú predpísaný, z ich peňazí. Nie je to vaša zbierka.", "Buy medicine they already have prescribed, with their money. It is not your collection."),
  idea("quiet-prayer", "sick", 10, true, "Ticho alebo modlitba, ak o ňu požiadajú", "Silence or a prayer, if they ask", "Zostanete ticho alebo sa pomodlíte ich slovami. Svoje im nevnucujete.", "Stay quiet or pray in their words. You do not impose yours."),
  idea("song-note", "sick", 5, true, "Krátka pieseň na diaľku", "A short song from afar", "Pošlete hlasovú správu s piesňou, ak telefón majú a chcú ju.", "Send a voice message with a song if they have a phone and want it."),
  idea("wash-cup", "sick", 10, true, "Umyť pohár a nechať vodu", "Wash a cup and leave water", "Umyjete jeden pohár a necháte pri ňom čistú vodu.", "Wash one cup and leave clean water beside it."),
  idea("shade-walk", "sick", 20, true, "Krátka prechádzka v tieni", "A short walk in the shade", "Prejdete sa len tak ďaleko, ako vládze. Tempo udáva on.", "Walk only as far as they can. They set the pace."),
  idea("use-name", "sick", 5, true, "Osloviť menom", "Use their name", "Pri ďalšej návšteve ich oslovíte menom, ktoré si pamätáte.", "On the next visit you use the name you remembered."),
  idea("greet-by-name", "quick", 1, true, "Pozdraviť menom", "Greet someone by name", "Zastavíte sa na jeden pozdrav a poviete meno. Nič za to nechcete.", "Stop for one greeting and say their name. You want nothing in return."),
  idea("hold-door", "quick", 1, true, "Podržať dvere", "Hold a door", "Podržíte dvere človeku, ktorý nesie niečo ťažké.", "Hold the door for someone carrying something heavy."),
  idea("one-piece", "quick", 3, true, "Jedno smeti z cesty", "One piece of litter", "Zdvihnete jeden kus odpadu, ktorý vám leží v ceste.", "Pick up one piece of litter that is in your way."),
  idea("thought-of-you", "quick", 2, true, "Napísať: myslel som na teba", "Write: I thought of you", "Pošlete krátku správu bez žiadosti o odpoveď.", "Send a short message that does not ask for a reply."),
  idea("share-seat", "quick", 1, true, "Uvoľniť miesto", "Offer a seat", "Uvoľníte miesto niekomu, kto stojí unavený.", "Give your seat to someone who is standing and tired."),
  idea("return-pencil", "quick", 2, true, "Vrátiť nájdenú ceruzku", "Return a found pencil", "Ceruzku alebo pero vrátite tomu, komu patrí.", "Return a pencil or pen to the person it belongs to."),
  idea("thank-cook", "quick", 1, true, "Poďakovať tomu, kto varil", "Thank the person who cooked", "Poviete ďakujem pri jedle. Nie je to prejav na kameru.", "Say thank you at the meal. It is not a performance for a camera."),
  idea("let-them-first", "quick", 1, true, "Nechať niekoho ísť prvého", "Let someone go first", "Vo fronte na vodu alebo chlieb pustíte dopredu staršieho alebo unaveného.", "In the line for water or bread, you let an older or tired person go ahead."),
  idea("cook-with-child", "family", 30, true, "Variť s dieťaťom", "Cook with a child", "Dieťa mieša alebo umýva jednu vec. Oheň držíte vy.", "A child stirs or washes one thing. You keep the fire."),
  idea("grandparent-story", "family", 15, true, "Príbeh starkého alebo starkej", "A grandparent's story", "Necháte staršieho človeka porozprávať jeden príbeh z ich mladosti.", "Let an older person tell one story from when they were young."),
  idea("wash-together", "family", 15, true, "Umývať riad spolu", "Wash dishes together", "Jeden umýva, druhý utiera. Nikto pri tom nikoho nezosmiešňuje.", "One washes, one dries. Nobody is mocked for it."),
  idea("mend-shirt", "family", 20, true, "Opraviť košeľu", "Mend a shirt", "Zašijete roztrhnuté miesto na košeli, ktorú niekto ešte nosí.", "Sew a tear in a shirt someone still wears."),
  idea("meal-without-phone", "family", 30, true, "Jedno jedlo bez telefónu", "One meal without a phone", "Počas jedla odložíte telefón. Rozprávate sa o tom, čo bolo dnes dobré.", "Put the phone away for the meal. Talk about one good thing from the day."),
  idea("walk-after-supper", "family", 20, true, "Prechádzka po večeri", "A walk after supper", "Prejdete sa okolo domu. Tempo udáva najpomalší.", "Walk around the house. The slowest person sets the pace."),
  idea("forgive-aloud", "family", 5, true, "Odpustiť malú vec nahlas", "Forgive a small thing out loud", "Poviete, že tá malá nepríjemnosť je odpustená. Nežiadate verejné ospravedlnenie.", "Say that a small irritation is forgiven. You do not demand a public apology."),
  idea("water-tomorrow", "family", 15, true, "Voda na zajtra", "Water for tomorrow", "Spoločne naplníte nádobu, ktorú budete potrebovať ráno.", "Together, fill the container you will need in the morning."),
  idea("sing-while-work", "mood", 10, true, "Spievať pri práci", "Sing while you work", "Spievate pri umývaní alebo zametaní. Kto nechce, nemusí sa pridať.", "Sing while washing or sweeping. Anyone who does not want to can stay quiet."),
  idea("one-dance-step", "mood", 10, true, "Jeden tanečný krok", "One dance step", "Naučíte jeden krok niekoho, kto o to požiada. Nie je to súťaž.", "Teach one step to someone who asks. It is not a contest."),
  idea("kind-joke", "mood", 5, true, "Vtip, ktorý nikoho neponíži", "A joke that shames no one", "Poviete vtip, v ktorom nikto nie je terčom posmechu.", "Tell a joke in which nobody is the target."),
  idea("clap-small", "mood", 2, true, "Zatlieskať malej veci", "Clap for a small success", "Zatlieskate, keď sa niekomu podarí malá vec. Bez rebríčka.", "Clap when someone manages a small thing. There is no ranking."),
  idea("draw-dust", "mood", 10, true, "Kresba do prachu", "A drawing in the dust", "Nakreslíte niečo pekné tam, kde to vietor môže zasa zmyť.", "Draw something kind where the wind can wash it away again."),
  idea("swap-recipe", "mood", 10, true, "Vymeniť si recept", "Swap a recipe", "Poviete, ako varíte jednu jednoduchú vec, a vypočujete si ich spôsob.", "Tell how you cook one simple thing, and listen to their way."),
  idea("name-one-good", "mood", 10, true, "Pri západe slnka jedna dobrá vec", "One good thing at sunset", "Pri západe slnka pomenujete jednu dobrú vec z dňa.", "At sunset, name one good thing from the day."),
  idea("one-kind-sentence", "mood", 5, true, "Jedna láskavá veta", "One kind sentence", "Napíšete alebo poviete jednu vetu, ktorá niekoho poteší a nikoho nezosmiešni.", "Write or say one sentence that cheers someone and mocks nobody."),
];
