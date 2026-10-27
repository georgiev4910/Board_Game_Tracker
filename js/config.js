/* Board Game Tracker 3.0 — config */
window.BGT = window.BGT || {};
BGT.VERSION = '3.0.0';
BGT.FIREBASE = {
  apiKey: "AIzaSyD_DjQ3XXZG3PM-yohUpPUXcQdrcDg5biE",
  authDomain: "boardgame-tracker-dafab.firebaseapp.com",
  projectId: "boardgame-tracker-dafab",
  storageBucket: "boardgame-tracker-dafab.appspot.com",
  messagingSenderId: "376292702901",
  appId: "1:376292702901:web:f9c7ccc119654b7a23dcfc"
};
BGT.INITIAL_GAMES = {
  "Everdell": "pvp",
  "Heat": "pvp",
  "7 Wonder Duel": "pvp",
  "Ticket to ride": "pvp",
  "Patchwork": "pvp",
  "Sky team": "coop",
  "Spirit Island": "coop",
  "Хляб и Бира": "pvp",
  "Aqualin": "pvp",
  "Каскадия": "pvp",
  "Такеноко": "pvp",
  "Домино": "pvp",
  "Порт Роял": "pvp",
  "Мандала": "pvp",
  "Splendor": "pvp",
  "Каркасон": "pvp",
  "Castles of Burgundy": "pvp",
  "Имхотеп - двубоят": "pvp"
};
BGT.GAME_PLAYERS = {
  'Everdell': [1, 4], 'Heat': [1, 6], '7 Wonder Duel': [2, 2],
  'Ticket to ride': [2, 5], 'Patchwork': [2, 2], 'Sky team': [2, 2],
  'Spirit Island': [1, 4], 'Хляб и Бира': [2, 4], 'Aqualin': [2, 2],
  'Каскадия': [1, 4], 'Такеноко': [2, 4], 'Домино': [2, 4],
  'Порт Роял': [2, 5], 'Мандала': [2, 2], 'Splendor': [2, 4],
  'Каркасон': [2, 5], 'Castles of Burgundy': [2, 4], 'Имхотеп - двубоят': [2, 2]
};
BGT.CATALOG_GAMES = {
  "Everdell": "pvp", "Heat": "pvp", "7 Wonder Duel": "pvp", "Ticket to ride": "pvp",
  "Patchwork": "pvp", "Sky team": "coop", "Spirit Island": "coop", "Хляб и Бира": "pvp",
  "Aqualin": "pvp", "Каскадия": "pvp", "Такеноко": "pvp", "Домино": "pvp",
  "Порт Роял": "pvp", "Мандала": "pvp", "Splendor": "pvp", "Каркасон": "pvp",
  "Castles of Burgundy": "pvp", "Имхотеп - двубоят": "pvp",
  "Catan": "pvp", "Azul": "pvp", "Wingspan": "pvp", "Terraforming Mars": "pvp",
  "Ark Nova": "pvp", "Brass Birmingham": "pvp", "Gloomhaven": "coop",
  "Pandemic": "coop", "Forbidden Island": "coop", "The Crew": "coop",
  "Codenames": "pvp", "Dixit": "pvp", "Just One": "coop", "Wavelength": "pvp",
  "Root": "pvp", "Scythe": "pvp", "Concordia": "pvp", "Cascadia": "pvp",
  "Quacks of Quedlinburg": "pvp", "Lost Ruins of Arnak": "pvp", "Dune Imperium": "pvp",
  "Marvel Champions": "coop", "Arkham Horror LCG": "coop", "Nemesis": "coop",
  "Blood Rage": "pvp", "Twilight Imperium": "pvp", "Great Western Trail": "pvp"
};
BGT.COMPANIONS = [
  { id: 'everdell', name: 'Everdell', file: 'everdell.html', icon: 'icons/game-everdell.svg', tone: 'forest' },
  { id: 'heat', name: 'Heat', file: 'Heat.html', icon: 'icons/game-heat.svg', tone: 'race' },
  { id: 'carcassonne', name: 'Carcassonne', file: 'carcassonne.html', icon: 'icons/game-carc.svg', tone: 'tile' },
  { id: 'skyteam', name: 'Sky Team', file: 'skyteam.html', icon: 'icons/game-sky.svg', tone: 'sky' },
  { id: 'castles', name: 'Castles of Burgundy', file: 'castles.html', icon: 'icons/game-castle.svg', tone: 'royal' },
  { id: 'spirit', name: 'Spirit Island', file: 'spirit_island.html', icon: 'icons/game-spirit.svg', tone: 'spirit' }
];
