const COMMON_WORDS = `
advokat aften aftensmad aldrig alle alene allerede altid anden andre ansigt arbejde arm bagefter barn begynde bedst besked betale bil blive blod bog bord briller bruge brød burde byen dag derefter det dette dig din dine doktor drikke dårlig døren efter eftermiddag eller ellers enkelt familie far farligt fejl finde fint fisk fjern fjernbetjening flere flytte for foran forkert forklare forstår fortsæt fra frem fuld gå går gammel gang gerne glad glas godt gulv hjælp hjemme høre højre hånd ikke igen igennem jeg kaffe kage kald kan kande kold komme kommer kunne krop læge længe læse lidt lille længere mad mand medicin mere middag mig min mine morgen muligt mor måske mund navn nat nej noget nogen nok normal nu ny nær næste når okay op over pause person plads problem pude på radio ret rigtig ring rundt ryg sætning seng senere side sige skal skifte sko skrive sluk små snakke snart sofa sort spørgsmål stol stop stor svar svært søn søster tale tallerken tand telefon tid tilbage toilet træt tv tydeligt tøj ud under vand varm ven venstre vente videre vil vindue være væk værelse øje øjne øjeblik ønske ja

af hvilken hvorfor hvem hvad hvor hvordan hvornår fordi derfor hvis men mens også bare både da de dem den der deres desuden du eller en et få får fik finde findes første først give giver gik gøre gør have har havde hele helt her hos hun ham han hende hver hverken ind ingen intet jo kunne man mange med mellem mod måtte meget måske ned nogen nogle om oppe os selv selvom sin sine sit siden sådan så til uden ved vi vores være var været bliver blev blive kommer kom siger sagde spørge spurgte tænke tror troede ønsker ønskede

akut alarm albue apparat appelsin avis bad badekar bakke banan batteri ben beskidt besøg besøge bestille bevæge bluse bukser bus butik bytte bøf computer creme dyne døgn elevator energi familie foto fod fodstøtte fodtøj formiddag frisør fryser gave grød gulerod hår håndklæde høreapparat internet jakke juice kalender kartoffel kat køkken køleskab lampe larm lift lys madras mælk nøgle ost papir pille pude regning ris saft salat sandwich serviet skjorte skærm sokker suppe sygeplejerske tandlæge taske temperatur te tæppe ur uge weekend yoghurt

åbne lukke tænde hente holde løfte sænke dreje rette flyt hjælpe vaske tørre spise drikke synke hoste hvile sove vågne sidde ligge stå komme gå ringe skrive læse se høre mærke føle spørge svare gentage forklare vælge ændre begynde slutte vente fortsætte stoppe købe betale bestille besøge savne huske glemme forstå mene tænke vide tro håbe ønske

ondt smerte smerter presset tryk ånden åndedræt vejrtrækning hoste slim kvalme svimmel svimmelhed varm varme kold kulde tør tørstig sulten mæt træt udmattet urolig rolig bange tryg behagelig ubehagelig bedre værre stærk svag langsom hurtigt langsomt højt lavt tydelig uklart

mandag tirsdag onsdag torsdag fredag lørdag søndag januar februar marts april maj juni juli august september oktober november december i dag i morgen i går formiddag eftermiddag aften nat tidligt sent snart senere nu

nul en to tre fire fem seks syv otte ni ti første anden tredje halv hel mere mindre meget lidt

kaffe kage kan kaffe kaffe kage kan
`;

const RAW_WORDS = COMMON_WORDS
  .split(/\s+/u)
  .map((word) => word.trim())
  .filter(Boolean);

const uniqueWords = [...new Set(RAW_WORDS.map((word) => word.toLocaleLowerCase('da-DK')))];

export const DEFAULT_DATA = {
  schemaVersion: 1,
  appVersion: '0.3.0-beta1',
  words: uniqueWords.map((text, index) => ({
    id: `starter-word-${index + 1}`,
    text,
    priority: Math.max(35, 100 - Math.floor(index / 9)),
  })),
  sentences: [
    {
      id: 'starter-sentence-1',
      text: 'Jeg vil gerne have en kop kaffe.',
      keywords: ['kaffe', 'drikke', 'kop'],
      priority: 95,
    },
    {
      id: 'starter-sentence-2',
      text: 'Kaffen er for varm.',
      keywords: ['kaffe', 'varm'],
      priority: 90,
    },
    {
      id: 'starter-sentence-3',
      text: 'Kaffen er blevet kold.',
      keywords: ['kaffe', 'kold'],
      priority: 85,
    },
    {
      id: 'starter-sentence-4',
      text: 'Jeg vil ikke have mere kaffe.',
      keywords: ['kaffe', 'mere', 'ikke'],
      priority: 82,
    },
    {
      id: 'starter-sentence-5',
      text: 'Vil du lave kaffe?',
      keywords: ['kaffe', 'lave'],
      priority: 78,
    },
    {
      id: 'starter-sentence-6',
      text: 'Jeg vil gerne have et stykke kage.',
      keywords: ['kage', 'spise', 'stykke'],
      priority: 92,
    },
    {
      id: 'starter-sentence-7',
      text: 'Kagen smager godt.',
      keywords: ['kage', 'godt'],
      priority: 75,
    },
    {
      id: 'starter-sentence-8',
      text: 'Kan du hjælpe mig?',
      keywords: ['kan', 'hjælp', 'hjælpe'],
      priority: 94,
    },
    {
      id: 'starter-sentence-9',
      text: 'Kan du gentage det?',
      keywords: ['kan', 'gentage', 'spørgsmål'],
      priority: 90,
    },
    {
      id: 'starter-sentence-10',
      text: 'Kan vi tale om noget andet?',
      keywords: ['kan', 'tale', 'andet'],
      priority: 86,
    },
    {
      id: 'starter-sentence-11',
      text: 'Jeg kan ikke forstå det.',
      keywords: ['kan', 'ikke', 'forstå'],
      priority: 84,
    },
    {
      id: 'starter-sentence-12',
      text: 'Jeg kan godt høre dig.',
      keywords: ['kan', 'høre', 'godt'],
      priority: 80,
    },
    {
      id: 'starter-sentence-13',
      text: 'Jeg vil gerne hvile lidt.',
      keywords: ['hvile', 'træt', 'lidt'],
      priority: 88,
    },
    {
      id: 'starter-sentence-14',
      text: 'Vil du hjælpe mig med at flytte mit ben?',
      keywords: ['hjælp', 'flytte', 'ben'],
      priority: 88,
    },
    {
      id: 'starter-sentence-15',
      text: 'Jeg har brug for min telefon.',
      keywords: ['telefon', 'bruge', 'hente'],
      priority: 80,
    },
    {
      id: 'starter-sentence-16',
      text: 'Hvad er klokken?',
      keywords: ['tid', 'klokken', 'hvad'],
      priority: 78,
    },
    {
      id: 'starter-sentence-17',
      text: 'Hvornår kommer du igen?',
      keywords: ['hvornår', 'kommer', 'igen'],
      priority: 76,
    },
    {
      id: 'starter-sentence-18',
      text: 'Jeg vil gerne se fjernsyn.',
      keywords: ['tv', 'fjernsyn', 'se'],
      priority: 74,
    },
  ],
};
