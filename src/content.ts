// Draft content. In the full build this moves to content/levels/<id>/level.yaml (see docs/PROJECT_SPEC.md §5).
export type Kind = 'platform' | 'launch' | 'minigame' | 'card' | 'person';

export interface LevelDef {
  id: string;
  kind: Kind;
  mechanic?: 'platform' | 'launch' | 'hotfire' | 'heli-catch' | 'orbit-raise' | 'sprint' | 'fault-finder' | 'splashdown' | 'cruise' | 'countdown-race' | 'ride' | 'orbit-ops' | 'dual-count' | 'arc-lab' | 'edit-bay' | 'slot-finder' | 'hat-trick' | 'fit-out';
  parent?: string; // bonus nodes only: the map node they branch from
  unlocks?: string; // platform levels: the bonus node opened by finding this level's hidden blueprint
  status: 'flown' | 'in-progress' | 'announced';
  title: string;
  date: string;
  place: string;
  map: { x: number; y: number };
  intro: string; // shown before play
  how?: string; // controls
  fact: string; // "did you know" on the intro card
  hero?: string; // character id, when this level is played as someone other than Peter Beck
  role?: string; // who the player's character is at this point in the story, shown on the name plate
  after: string; // "what really happened" on the result card
  egg?: string; // easter egg text, revealed when found
  photo?: { file: string; caption: string; credit: string; page: string; src?: string; official?: boolean };
  diagram?: { key: string; caption: string }; // a labelled drawing (art.ts DIAGRAMS) shown on the intro card
  watch?: { url: string; label: string }; // a video on its own site: linked, never copied
  portrait?: string; // people: character prefix of a drawn portrait, used when there is no freely licensed photo
  portraitCredit?: string; // people: where the drawn portrait's likeness comes from
  sources: string[];
  params?: any;
  /** Set by the engine while a level in several acts is being played (see `then` in core.finish): the worst stars so far, and whether the egg has been earned. */
  _stars?: number; _egg?: boolean;
}

const WP = 'https://en.wikipedia.org/wiki/';
const C = 'https://commons.wikimedia.org/wiki/File:';
const RL = 'https://rocketlabcorp.com/';
/** What goes aboard Return On Investment, for both acts of its level: [key, kind, label, place along the deck (-1 stern to 1 bow), weight, goes over]. */
const ROI_ITEMS = [
  ['t1', 'thruster', 'Thruster 1', -0.78, 3], ['t2', 'thruster', 'Thruster 2', -0.66, 3], ['t3', 'thruster', 'Thruster 3', 0.76, 3], ['t4', 'thruster', 'Thruster 4', 0.88, 3],
  ['pw', 'power', 'Power generation', -0.4, 3], ['bs', 'shield', 'Blast shield', -0.4, 1, 'pw'], ['cg', 'cradle', 'Capture gear', 0.2, 3],
];

export const LEVELS: LevelDef[] = [
  {
    id: 'workshop', kind: 'platform', mechanic: 'platform', status: 'flown', unlocks: 'street-sprint',
    title: 'The Rocket Bike', date: '1995–2000', place: 'Dunedin, Aotearoa New Zealand', map: { x: 102, y: 366 },
    intro: 'A teenager from Invercargill who turbocharged an old Mini takes a tool-and-die apprenticeship at Fisher & Paykel. By day, appliances. After hours the workshop becomes a propulsion lab: a rocket bike, a rocket scooter, a jet pack.',
    how: 'Arrows to run, Space to jump. Collect all five parts and reach the bike. Jump on the runaway rocket scooter and the snapping DishDrawer to stop them; wait out the welding sparks and dodge the steam. Power-ups float in bubbles: the jet pack lets you fly (hold Space), the yellow suit and helmet make you untouchable. A hidden blueprint unlocks a secret level.',
    fact: 'Peter Beck never went to university. He taught himself propulsion with the company’s tools and offcuts.',
    after: 'Beck built a rocket bike, a rocket-attached scooter and a jet pack while at Fisher & Paykel, then bought a cruise-missile engine from the US. He raced the peroxide-fuelled bike down Princes Street in Dunedin at about 140 km/h, lying low along the frame in a jumpsuit. He later worked on composites and superconductors at Industrial Research Ltd (2001–2006).',
    egg: 'The water rocket. Before the peroxide and the bike, teenage Beck was launching water rockets in Invercargill.',
    role: 'Apprentice toolmaker · 1990s',
    photo: { file: 'beck_2018.jpg', caption: 'Peter Beck, pictured in 2018, two decades after the rocket bike.', credit: 'New Zealand Government, Office of the Governor-General, CC BY 4.0', page: C + 'Peter_Beck_2018.jpg' },
    sources: [WP + 'Peter_Beck'],
    params: {
      theme: 'workshop', width: 64,
      ground: [[0, 13, 9], [16, 27, 9], [30, 41, 9], [45, 63, 9]],
      plats: [[5, 7, 3], [19, 7, 3], [22, 5, 3], [33, 7, 2], [36, 5, 3], [48, 7, 3], [51, 5, 3]],
      parts: [[6, 6, 'Bike frame'], [20, 6, 'Peroxide tank'], [37, 4, 'Rocket nozzle'], [49, 6, 'Helmet'], [52, 4, 'Jumpsuit']],
      hazards: [8, 38, 56], sheep: [], egg: [23, 4], goal: 60,
      enemies: [['drawerbot', 17, 21], ['sparks', 25, 25], ['sparks', 30, 30], ['scooter', 46, 54]],
      powerups: [['J', 11, 8], ['S', 31, 8]], secret: [15, 2],
      signs: [[2, 'mini'], [40, 'jetpack'], [54, 'missile']],
    },
  },
  {
    id: 'founded', kind: 'card', status: 'flown',
    title: 'Rocket Lab is founded', date: '2006-06', place: 'Auckland', map: { x: 184, y: 215 },
    intro: 'In 2006 Beck joins his wife’s work trip to the United States and turns his side of it into a self-guided “rocket pilgrimage”: Ky “Rocketman” Michaelson in Minnesota, then NASA and the big aerospace contractors. He comes home convinced nobody is building the small, cheap rocket he has in mind. So in June 2006 he starts a company to do it.',
    fact: 'One of the first seed investors was an internet entrepreneur who had already changed his surname to… Rocket. Mark Rocket was co-director from 2007 to 2011. Sir Stephen Tindall, founder of The Warehouse, was another early backer.',
    after: '',
    photo: { file: 'beck_newman_2016.jpg', caption: 'Peter Beck (right) with NASA Deputy Administrator Dava Newman, 2016. On the wall behind them: the Ātea-1 sounding rocket and its siblings.', credit: 'US Embassy New Zealand, CC BY 2.0', page: C + 'Dr_Dava_Newman,_NASA_Deputy_Administrator_visit_to_New_Zealand,_July_11-18,_2016_(27619573814).jpg' },
    sources: [WP + 'Rocket_Lab', WP + 'Peter_Beck'],
  },
  {
    id: 'atea-1', kind: 'launch', mechanic: 'launch', status: 'flown', role: 'Founder · Rocket Lab, 2009',
    title: 'Ātea-1', date: '2009-11-30', place: 'Great Mercury Island', map: { x: 206, y: 188 },
    intro: 'A 6.5-metre, 60 kg sounding rocket stands on a private island off the Coromandel. The local iwi have named it Manu Karere, “Bird Messenger”. It is a boosted dart with no guidance at all: once it leaves the rail, the only steering is the wind. Your job: get the dart past the Kármán line at 100 km, where space is internationally taken to begin, and bring it down inside the range.',
    how: 'A sounding rocket is aimed, not flown. ↑ ↓ set the rail elevation; the TRAJECTORY plot shows the flight predicted for the wind at this moment (an unguided rocket weathercocks into the wind as it leaves the rail). Get the apogee over the 100 km line and the impact inside the green 35–65 km safety zone, then press Space to start the count. Enter holds the count if a gust takes it out of limits. At burnout press Space at once to release the dart: the spent booster is nothing but drag.',
    fact: 'Ātea is Māori for “space”. The launch site was Sir Michael Fay’s privately owned island. A fuel-coupler fault held the count on launch day until a spare part arrived by helicopter.',
    after: 'At 14:23 local time on 30 November 2009, Ātea-1 flew, and Rocket Lab says it became the first private company in the Southern Hemisphere to reach space. The booster was recovered; the dart came down about 50 km downrange and never was, so the apogee rests on the boost-phase data. Lost: one dart.',
    photo: { file: 'beck_newman_2016.jpg', caption: 'Peter Beck (right) with NASA Deputy Administrator Dava Newman, 2016. The tall rocket on the wall is marked ĀTEA-01.', credit: 'US Embassy New Zealand, CC BY 2.0', page: C + 'Dr_Dava_Newman,_NASA_Deputy_Administrator_visit_to_New_Zealand,_July_11-18,_2016_(27619573814).jpg' },
    sources: [WP + 'Rocket_Lab', 'https://www.sciencelearn.org.nz/resources/2431-rocket-lab', 'https://www.sciencelearn.org.nz/videos/175-new-zealand-s-first-space-rocket', 'https://space.skyrocket.de/doc_lau/atea-1.htm'],
    diagram: { key: 'atea', caption: 'Ātea-1 as Peter Beck walks through it on a wind-tunnel model in a 2011 Science Learning Hub video (drawn for the game; not to scale). The booster is a hybrid: a solid fuel grain at the back, and the rest of it liquid oxidiser under high pressure. The slimmer upper section carries the payload, flight computers, recovery and separation systems, and separates to shed drag and dead mass. Climbing at about five times the speed of sound, the nose tip reached roughly 900 °C.' },
    watch: { url: 'https://www.sciencelearn.org.nz/videos/175-new-zealand-s-first-space-rocket', label: 'Peter Beck explains Ātea-1 on a model of the rocket (Science Learning Hub, 2011)' },
    params: { vehicle: 'atea-1', site: 'island', goal: { apogee_km: 100, zone_km: [35, 65] }, payload: 'Instrument dart' },
  },
  {
    id: 'rutherford', kind: 'minigame', mechanic: 'hotfire', status: 'flown', role: 'Founder and chief engineer',
    title: 'Rutherford hot-fire', date: '2013–2016', place: 'Auckland test stand', map: { x: 157, y: 227 },
    intro: 'Rocket Lab moves its registration to the US in 2013, raises money from Khosla Ventures, and bets on a strange engine: 3D-printed by electron-beam melting, with propellant pumps driven by battery-powered electric motors instead of a gas turbine.',
    how: 'Hold Space to spin the pumps up, release to let them drop. Keep chamber pressure inside the green band until the qualification bar is full, before the batteries run flat.',
    fact: 'The engine is named after Ernest Rutherford, the New Zealand-born physicist. Electron’s second stage really does jettison spent batteries mid-flight: the “battery hot-swap”.',
    after: 'Rutherford became the first electric-pump-fed engine to power an orbital-class rocket. The second-stage engine finished firing tests by March 2016, and Electron completed flight qualification that December.',
    egg: 'A perfect burn. You never left the green band for more than a blink.',
    sources: [WP + 'Rocket_Lab_Electron', WP + 'Rocket_Lab'],
  },
  {
    id: 'find-the-launch-site', kind: 'minigame', mechanic: 'ride', status: 'flown', hero: 'shaun', role: 'Engineer · site hunting', unlocks: 'first-hundred',
    title: 'Go Find the Launch Site', date: 'about 2015', place: 'Māhia Peninsula', map: { x: 226, y: 224 },
    intro: 'Rocket Lab has a rocket on the drawing board and nowhere to launch it. One contender, in the South Island, already has power and roads. The job of finding something better goes to a young engineer on a team of fewer than fifteen, Shaun D’Mello, and the people around him: “Pete just told me to go find the launch site,” he recalled years later. A map, some trajectory analysis, helicopter rides and long road trips lead them to the far end of the Māhia Peninsula, where there is, in Rocket Lab’s words, “open ocean to the north, south and east”, and no road at all. The last leg, from the top of the farm to where a pad might go, is 45 minutes by dirt bike. This level is his.',
    how: 'You play Shaun D’Mello, on a trail bike. → throttle, ← brake, Space hops. In the air, ← → tip the bike so both wheels meet the slope: land it on its nose or its tail and you are off. Hop the stumps and the gullies. Sheep will not move for a bike at speed, so slow to a crawl or hop them. Mud drags unless you carry speed into it. Ride through all five survey flags and reach the stake where the land ends. Three stars for a clean run inside 50 seconds. One bubble holds knobbly tyres, which ignore mud and bite for a higher hop, and a blueprint hangs just too high for an ordinary one.',
    fact: 'What he was looking for was empty sea. A rocket drops its stages, and if it fails itself, downrange, so every direction that is clear of land and people is another set of orbits a pad can reach. In D’Mello’s words, they “ran the trajectories and determined there is no better place in all of New Zealand or the majority of the planet”.',
    after: 'Rocket Lab’s account is that once the site was chosen it went from permits to construction in two to three weeks, and that early operations ran from shipping containers. In November 2015 the company named Māhia as its main launch site (the consents, and the launch rate they allowed, are the next chapter’s part of that decision), and Launch Complex 1 opened there in September 2016. Shaun D’Mello, who joined in 2014, ran the launch control team for Electron’s first flight in 2017 and is now Vice President, Neutron. (The account does not say who rode: the game puts him on the bike, and the ride, its sheep and its gullies are the game’s own picture of those 45 minutes.)',
    egg: 'A shipping container: Rocket Lab’s account says early operations at Māhia ran from them. From the same account: Rocket Lab’s mission tracker was built with room for only two digits, and before launch 100 someone had to go back in and add a third.',
    sources: [RL + 'updates/trust-me-its-gonna-take-off-inside-electrons-first-100-launches/', RL + 'about/team/', WP + 'Rocket_Lab_Launch_Complex_1'],
    params: {
      theme: 'farm', par: 50, flagWord: 'SURVEY',
      terrain: [[0, 130], [150, 130], [330, 112], [470, 134], [620, 120], [760, 100], [860, 126], [1000, 132], [1120, 112], [1180, 112], [1300, 130], [1460, 138], [1640, 116], [1760, 96], [1880, 120], [2020, 134], [2160, 118], [2220, 118], [2380, 134], [2560, 126], [2700, 92], [2840, 116], [3000, 128], [3200, 110], [3400, 110]],
      gaps: [[1182, 1226], [2222, 2268]],
      zones: [['mob', 400, 26], ['block', 700, 14], ['bog', 880, 90], ['mob', 1500, 26], ['block', 1690, 14], ['bog', 1900, 100], ['bog', 2400, 110], ['mob', 2900, 26]],
      flags: [[250, 'North-east: open sea'], [1040, 'East: open ocean'], [1700, 'South: open ocean'], [2600, 'No road. Bring one'], [3250, 'Room for a pad']],
      egg: [2245, 26], secret: [2545, 49], powerups: [['K', 2340, 24]],
    },
  },
  {
    id: 'lc-1', kind: 'platform', mechanic: 'platform', status: 'flown', role: 'Founder and CEO · 2016', unlocks: 'kaitorete',
    title: 'Road to Māhia', date: '2016-09-26', place: 'Māhia Peninsula', map: { x: 199, y: 240 },
    intro: 'Consents for the first-choice site, Kaitorete Spit near Christchurch, drag on, and Māhia can be licensed for far more launches. So the pad goes to Onenui Station, sheep and beef country on Tawapata South land at the tip of the Māhia Peninsula, at the end of a long coast road. Someone has to get the hardware there.',
    how: 'Arrows to run, Space to jump. Collect the five pad components and reach the pad. Jump on rams, gulls and rolls of red tape to see them off; the ordinary sheep just bump you. Don’t fall in the sea. Power-ups float in bubbles: gumboots make you faster and give a second jump in mid-air, the hard hat and hi-vis vest make you untouchable. A hidden blueprint unlocks a secret on the map.',
    fact: 'Launch Complex 1 is the world’s first private orbital launch site, licensed to launch as often as every 72 hours for 30 years.',
    after: 'Launch Complex 1 officially opened on 26 September 2016, in wild weather, with no rocket on the pad yet: the first Electron arrived in February 2017. A second pad, LC-1B, hosted its first launch in February 2022 with “The Owl’s Night Continues”.',
    egg: 'A garden gnome on a hilltop. In 2020, “Return to Sender” flew a 3D-printed gnome called Chompski for Valve’s Gabe Newell, who paid a dollar to charity for every livestream viewer.',
    photo: { file: 'lc1.jpg', caption: 'Launch Complex 1 on the Māhia Peninsula.', credit: 'Grumpy Eye, CC BY-SA 2.0', page: C + 'Rocket_Lab_Launch_Complex_1.jpg' },
    sources: [WP + 'Rocket_Lab_Launch_Complex_1', WP + 'Rocket_Lab'],
    params: {
      theme: 'mahia', width: 72,
      ground: [[0, 10, 9], [11, 18, 8], [21, 30, 9], [33, 40, 8], [41, 50, 9], [53, 71, 9]],
      plats: [[16, 6, 2], [20, 2, 2], [22, 7, 3], [35, 6, 2], [46, 7, 3], [56, 7, 2]],
      parts: [[14, 6, 'Strongback'], [23, 6, 'LOX tank'], [38, 6, 'Flame deflector'], [47, 6, 'Range antenna'], [57, 6, 'Launch mount']],
      hazards: [], sheep: [44], egg: [36, 4], goal: 68,
      enemies: [['redtape', 5, 8], ['gull', 26, 32], ['ram', 24, 28], ['gull', 33, 45], ['ram', 61, 65]],
      powerups: [['B', 17, 5], ['H', 42, 8]], secret: [20, 1],
      signs: [[3, 'sign2'], [9, 'sign3'], [54, 'sign']],
    },
  },
  {
    id: 'its-a-test', kind: 'launch', mechanic: 'launch', status: 'flown',
    title: 'It’s a Test', date: '2017-05-25', place: 'LC-1, Māhia', map: { x: 237, y: 270 },
    intro: 'Flight one. A black carbon-composite rocket, 17 m tall and barely wider than a doorway, with nine Rutherfords underneath. The name says it all: nobody is promising orbit today.',
    how: 'You are launch director and flight controller. THE COUNT: stations report go or no-go. If one turns red, press Enter to call a hold before the auto-sequencer has to. At T-0 Space releases the hold-downs. STAGE 1: ← → pitch the vehicle. Keep the white needle on the green cue of the flight director: straight up, a small pitch-over, then a gravity turn with the nose on the velocity vector. ↑ ↓ throttle: ease off so dynamic pressure stays under its limit through Max-Q, then throttle back up. Flying off the cue in thick air builds Q-alpha load. SEQUENCE: Space commands each event when it is prompted: stage separation after MECO, stage-2 ignition, fairing jettison once heating is below 1,135 W/m², and the battery hot-swap. Enter is SECO.',
    fact: 'Electron’s mission names became a running joke with fans: “Still Testing”, “It’s Business Time”, “Pics Or It Didn’t Happen”, “Running Out Of Fingers” (flight 10), “Running Out Of Toes” (flight 20).',
    after: 'Electron reached space on its first try. At about 224 km a contractor’s ground equipment lost telemetry because of a misconfiguration (forward error correction had not been switched on), and range safety had to terminate a perfectly healthy rocket. Nothing was wrong with the vehicle.',
    sources: [WP + 'Rocket_Lab_Electron', 'https://spaceflightnow.com/2017/05/25/maiden-flight-of-rocket-labs-small-satellite-launcher-reaches-space/'],
    params: { vehicle: 'electron', site: 'mahia', goal: { orbit: true, orbit_km: 500, inject_km: 300 }, twist: 'scripted-no-orbit', payload: 'Test instruments' },
  },
  {
    id: 'still-testing', kind: 'launch', mechanic: 'launch', status: 'flown',
    title: 'Still Testing', date: '2018-01-21', place: 'LC-1, Māhia', map: { x: 260, y: 246 },
    intro: 'Flight two. Three customer CubeSats for Planet and Spire are aboard, plus two things nobody outside the company knows about yet. The first attempt, in December 2017, aborted at T-2 seconds with the engines already lit. Take it all the way this time.',
    how: 'Fly it as before: call the count, ← → on the flight-director cue, ↑ ↓ throttle through Max-Q, Space for separation, stage-2 ignition, fairing and hot-swap. This time go all the way: watch the predicted apogee (AP) climb and press Enter for SECO as it reaches 500 km. Then the kick stage: hold Space to burn Curie, centred on apogee, until perigee comes up to meet it, and press Enter to deploy the Lemur-2s.',
    fact: 'The secret passengers: a brand-new kick stage with its own Curie engine, and the Humanity Star, a one-metre carbon-fibre geodesic sphere with 65 mirror panels meant to be seen from the ground.',
    after: 'Electron reached orbit on 21 January 2018. The Humanity Star and Planet’s Dove were released into the elliptical transfer orbit; the secret kick stage then coasted to apogee and circularised the orbit for Spire’s two Lemur-2s. The Humanity Star flashed across night skies until it re-entered in March 2018.',
    egg: 'The secret kick stage. Nobody outside the company knew it was aboard until it had worked. You lit Curie on the first pass, just like the real one.',
    photo: { file: 'humanity_star.jpg', caption: 'The Humanity Star flaring across the night sky, 2018.', credit: 'cafuego, CC BY-SA 2.0', page: C + 'Humanity_Star_(39753474634).jpg' },
    sources: [WP + 'Rocket_Lab_Electron', WP + 'Humanity_Star'],
    params: { vehicle: 'electron', site: 'mahia', goal: { orbit: true, orbit_km: 500, inject_km: 300 }, twist: 'kick-stage', payload: 'Humanity Star', kickPayload: 'Two Lemur-2 CubeSats', scrub: true },
  },
  {
    id: 'its-business-time', kind: 'launch', mechanic: 'launch', status: 'flown',
    title: 'It’s Business Time', date: '2018-11-11', place: 'LC-1, Māhia', map: { x: 284, y: 262 },
    intro: 'Flight three, and the first fully commercial one: six satellites and a drag-sail experiment, for Spire, Fleet Space, GeoOptics and a student CubeSat programme in Irvine, California. The mission should have flown in April. A first-stage motor controller behaved oddly in a wet dress rehearsal, did it again on the pad in June, and the launch window was given up. Now it is November, and one small kick stage has to hand out every satellite in turn.',
    how: 'The first count will not go to plan. After that, fly it as before: Enter holds the count, ← → on the flight-director cue, ↑ ↓ throttle through Max-Q, Space for each sequence event, Enter for SECO at 500 km apogee, hold Space to circularise with Curie at apogee, Enter when the orbit is round. New here, the DEPLOY SEQUENCE: ← → turn the kick stage until the white dispenser line sits on the green marker, let the body rate settle, then Space releases the next satellite. Every release kicks the stage, so steady it again. A release off the line risks recontact and costs a star.',
    fact: 'Stage two left the stack in a 210 × 500 km orbit inclined 85°; the Curie kick stage circularised it at 500 km before letting anything go. Fleet Space’s two Proximas only joined the manifest about a fortnight before launch. The mission name is widely reported to be a nod to “Business Time” by the New Zealand comedy duo Flight of the Conchords.',
    after: 'Electron lifted off at 16:50 NZDT on 11 November 2018 and delivered all seven payloads: two Lemur-2s for Spire, two Proxima CubeSats for Fleet Space, a CICERO for GeoOptics, IRVINE01 from the Irvine CubeSat STEM Program, and NABEO, a drag-sail demonstrator built by High Performance Space Structure Systems, which stayed on the kick stage. Five weeks later Electron flew again, for NASA: “This One’s For Pickering”. (The order of the releases, and pointing the stage for each one, are the game’s own: the published timeline shows the payloads separating about 54 minutes after lift-off.)',
    egg: 'Six for six, every release on its line. One of the six was IRVINE01, built by high-school students from six schools in Irvine, California: a students’ satellite on Rocket Lab’s first fully commercial flight.',
    sources: [RL + 'missions/launches/its-business-time/', RL + 'updates/rocket-lab-reaches-orbit-again-deploys-more-satellites/', 'https://spaceflightnow.com/2018/06/27/rocket-labs-first-commercial-launch-scrubbed-again/', 'https://www.geekwire.com/2018/rocket-lab-electron-rocket-sends-satellites-into-orbit-from-new-zealand/', 'https://satnews.com/2018/10/30/fleet-space-technologies-joins-rocket-labs-electron-manifest-for-november-launch/'],
    params: {
      vehicle: 'electron', site: 'mahia', goal: { orbit: true, orbit_km: 500, inject_km: 210 }, twist: 'kick-stage', payload: 'Six satellites + NABEO',
      scrub: { at: 9.5, text: 'SCRUB · 27 June 2018 · a stage-1 motor controller is misbehaving · stand down', resume: '11 November 2018 · new attempt · T-8' },
      deploy: ['Lemur-2 · Spire', 'Lemur-2 · Spire', 'CICERO · GeoOptics', 'Proxima · Fleet Space', 'Proxima · Fleet Space', 'IRVINE01 · Irvine STEM'],
      sail: 'NABEO drag-sail demonstrator · it stays on the kick stage', sailNote: 'NABEO, the drag-sail demonstrator, stayed bolted to the kick stage.',
    },
  },
  {
    id: 'factory', kind: 'platform', mechanic: 'platform', status: 'flown', role: 'Founder and CEO · 2019', unlocks: 'photon',
    title: 'Rosie the Robot', date: '2019-11-13', place: 'Auckland production complex', map: { x: 128, y: 214 },
    intro: 'Five launches so far in 2019, a sixth due in December, and customers queueing for more. Rocket Lab can finish an Electron about every thirty days; the plan calls for one a week. The slow part is the carbon. Every composite structure comes out of the cure oven needing to be marked, trimmed, drilled and sanded, and by hand that is more than 400 hours a rocket. So in November 2019 the Auckland factory switches on a 140-square-metre, six-axis machine to do all of it, and gives it a name: Rosie. Get today’s parts onto her bed.',
    how: 'Arrows to run, Space to jump. Collect the five things Rosie needs and reach her cell. New here: conveyors. A belt carries you along whether you walk or not, with it or against it, so time your jumps on and off. Jump on runaway sanders and loose rolls of carbon fibre to stop them; wait out the offcuts falling from the trimming heads; duck the clouds of carbon dust. Power-ups float in bubbles: the clean-room suit makes you untouchable, and the carbon-weave jacket makes you light enough to jump far higher. The bubble with Ashlee Vance’s face by the door brings the journalist along for 20 seconds: his notebook marks where the hidden things are, and Enter takes a photo whose flash stops troublemakers in their tracks for a moment. A hidden blueprint unlocks a secret on the map.',
    fact: 'Rosie’s machining window is 3.5 m by 16 m, with five axes of movement plus a sixth that turns the part. The Rutherford engines came from further away: in 2019 they were built at Rocket Lab’s headquarters in Huntington Beach, California, and shipped to New Zealand.',
    after: 'Rosie was unveiled on 13 November 2019. Rocket Lab said she could process every carbon-composite component of an Electron in 12 hours, a job that had taken more than 400 by hand. The six launches of 2019 all reached orbit, and the last of them, “Running Out Of Fingers”, was also the first to steer its first stage back through the atmosphere: the start of the road to recovery.',
    egg: 'Engine number 100. Rocket Lab finished its hundredth Rutherford in July 2019, at its Huntington Beach headquarters in California, and shipped it to New Zealand like all the others. By then seventy of them had already flown.',
    sources: ['https://www.space.com/rocket-lab-rosie-robot-build-rocket-12-hours.html', 'https://satnews.com/2019/11/13/rosie-rocks-rocket-lab/', 'https://techcrunch.com/2019/11/13/rocket-labs-new-rosie-the-robot-speeds-up-launch-vehicle-production-by-a-lot', RL + 'updates/rocket-lab-celebrates-100th-rutherford-engine-build/', 'https://www.thefabricator.com/additivereport/news/additive/rocket-lab-celebrates-completion-of-its-100th-3d-printed-engine', WP + 'List_of_Electron_launches', 'https://www.bloomberg.com/news/features/2023-05-04/peter-beck-s-rocket-lab-challenges-elon-musk-and-spacex', 'https://www.iheart.com/podcast/1049-markets-with-madison-128331977/episode/untold-rocket-lab-astra-stories-197999327/'],
    params: {
      theme: 'factory', width: 80, buddy: 'vance',
      ground: [[0, 14, 9], [17, 31, 9], [34, 48, 9], [51, 79, 9]],
      plats: [[4, 7, 3], [18, 7, 3], [21, 5, 3], [39, 7, 3], [42, 5, 2], [52, 8, 3], [55, 6, 4], [70, 7, 3]],
      belts: [[8, 13, 9, 1], [24, 28, 9, -1], [36, 46, 9, 1], [55, 58, 6, 1]],
      parts: [[5, 6, 'Stage 1 structure'], [22, 4, 'Stage 2 structure'], [40, 6, 'Fairing half'], [56, 5, 'The other fairing half'], [71, 6, 'Rosie’s cutting program']],
      hazards: [], sheep: [], egg: [43, 4], goal: 76,
      enemies: [['roll', 18, 21], ['offcuts', 35, 35], ['dust', 59, 62], ['sander', 64, 67], ['offcuts', 74, 74]],
      powerups: [['C', 2, 8], ['L', 10, 6], ['T', 37, 8]], secret: [30, 3],
      signs: [],
    },
  },
  {
    id: 'pics-or-it-didnt-happen', kind: 'minigame', mechanic: 'fault-finder', status: 'flown',
    title: 'Pics Or It Didn’t Happen', date: '2020-07-04', place: 'LC-1, Māhia → mission control, Auckland', map: { x: 272, y: 288 },
    intro: 'Flight 13. Seven satellites ride under the fairing: an Earth-imaging satellite for Canon, five SuperDoves for Planet and Faraday-1 for In-Space Missions. A few minutes into the second-stage burn the engine shuts down, and Electron does not reach orbit. After eleven successful missions in a row, Rocket Lab has lost its customers’ satellites for the first time. The answer is somewhere in the telemetry. Find it, prove it, and get Electron flying again.',
    how: 'TRACE: six telemetry channels from the last two minutes of the burn. ← → move the cursor through time, ↑ ↓ change channel, Space flags a point. Flag the FIRST sign of trouble: every symptom you find points at something that began earlier, and wrong flags cost days. BENCH: ↑ ↓ choose a test and Space to run it on the suspect harness; every test costs days too. When one connection gives itself away, ← → select it and Enter to tag it. Three stars for a root cause within 27 days, which is what the real review took.',
    fact: 'Rocket Lab’s finding was a single anomalous electrical connection that was “intermittently secure through flight”. Its rising resistance made heat, the heat softened the potting compound around it, and the connection let go. It had stayed secure through every standard acceptance test: vibration, thermal vacuum and thermal cycling.',
    after: 'Electron lifted off at 21:19 UTC on 4 July 2020 (the morning of the 5th at Māhia) and was lost during the second-stage burn. On 31 July, 27 days later, Rocket Lab announced the cause and that the FAA had cleared Electron to fly again. No redesign was needed: the fix was additional testing and procedures to screen for the fault. On 31 August, 58 days after the failure, “I Can’t Believe It’s Not Optical” delivered Capella’s Sequoia satellite to orbit. (The channels and bench tests in this level are a simplified stand-in for the real investigation.)',
    egg: 'No false leads, one test. The return-to-flight rocket carried a secret as well as a customer: Rocket Lab’s own first satellite, “First Light”.',
    sources: [RL + 'updates/rocket-lab-mission-fails-to-reach-orbit/', RL + 'updates/rocket-lab-to-resume-electron-launches-in-august/', 'https://spaceflightnow.com/2020/07/04/rocket-lab-satellite-launch-fails-before-reaching-orbit/', 'https://spaceflightnow.com/2020/07/31/rocket-lab-identifies-faulty-electrical-connector-as-cause-of-launch-failure/', RL + 'missions/launches/i-cant-believe-its-not-optical/'],
  },
  {
    id: 'return-to-sender', kind: 'minigame', mechanic: 'splashdown', status: 'flown',
    title: 'Return To Sender', date: '2020-11-20', place: 'Pacific Ocean, downrange of Māhia', map: { x: 300, y: 318 },
    intro: 'Electron was never meant to come back: Peter Beck had said Rocket Lab would not do reusable rockets, and that he would eat his hat if it did. By 2020 the company is trying anyway. On the sixteenth flight, while stage two carries the satellites on towards orbit, the first stage turns itself around at the edge of space and attempts what no Electron has done before: to come down through re-entry, which Rocket Lab calls “the wall”, under two parachutes, and be lifted out of the Pacific in one piece.',
    how: 'The booster has coasted over the top of its arc and is falling back nose-first, almost 80 km up, where there is no air. ← → fire the cold-gas thrusters: a puff starts it turning, and only a puff the other way stops it. Get the engines pointing down (white needle in the green wedge) before 55 km, then hold it there while the air shakes it. Fly the wall sideways and the stage breaks up. Then the parachutes: Space opens the drogue once the speed is under Mach 2, and Space again opens the main chute once the drogue has slowed the stage below 110 m/s. Too early tears a chute off; too late, and the sea arrives first.',
    fact: 'Rocket Lab’s numbers for the real descent: separation about 80 km up, a 180° flip on reaction-control thrusters, a peak of 2,350 m/s with the air around the engines hotter than 2,400 °C, a drogue parachute below Mach 2, and into the water at 9 m/s. Space and back in 13 minutes.',
    after: 'Electron lifted off at 3:20 pm New Zealand time on 20 November 2020 and delivered what Rocket Lab counted as thirty satellites. The first stage came down under its main parachute, a little slower than planned, was lifted out of the ocean by a recovery ship and went back to the factory to be taken apart: the first Electron booster ever recovered. Eighteen months later a helicopter would try to catch one in mid-air. (The altitudes of “the wall” and the main-chute speed limit in this level are game values.)',
    egg: 'Engines-first, gas to spare, a gentle landing. Riding on the kick stage that day was Gnome Chompski: 150 mm of 3D-printed titanium, made with Wētā Workshop for Valve’s Gabe Newell, who gave a dollar to the children’s intensive care unit at Starship hospital for every person who watched the launch. Chompski stayed bolted to the kick stage and burned up with it.',
    sources: [RL + 'updates/rocket-lab-launches-16th-mission-completes-booster-recovery/', RL + 'updates/how-to-bring-a-rocket-back-from-space/', 'https://spaceflightnow.com/2020/11/20/rocket-lab-recovers-booster-after-launch-with-30-small-satellites/', WP + 'Peter_Beck', 'https://www.geekwire.com/2019/rocket-lab-will-try-helicopter-recovery-rocket-booster-ceo-will-eat-hat/'],
  },
  {
    id: 'eat-the-hat', kind: 'minigame', mechanic: 'hat-trick', status: 'flown', role: 'Founder and CEO · 2021',
    title: 'Eating the Hat', date: '2021-03-01', place: 'Long Beach, California · the Neutron announcement', map: { x: 590, y: 300 },
    intro: 'Electron was built to be thrown away, and Peter Beck had said that if Rocket Lab ever made its rockets reusable, he would eat his hat. In August 2019 he told the SmallSat conference that Electron’s first stage would be recovered after all, and in November 2020 one came back from space. On 1 March 2021 Rocket Lab announces that it will go public by merging with Vector Acquisition Corporation, and unveils Neutron: a bigger rocket, with a reusable first stage. The announcement video walks through a factory and ends at a dinner table. Gather what the scene needs, then settle the bet.',
    how: 'Act one is a tracking shot. ← → walk; hold Space beside the blue blazer, the cap and the blender to put them on or pick them up. The camera’s frame glides along the hall at its own pace: stay inside it. Out of shot for too long and the director calls a cut, and the take starts again (three takes at most). Gather all three, then walk through to the set as the camera gets there. Three stars for one take.',
    fact: 'Neutron as announced on 1 March 2021: about 40 m tall, up to 8 tonnes to low Earth orbit (2 tonnes to the Moon, 1.5 to Mars or Venus), and a reusable first stage designed to land on an ocean platform. It was built for launching satellite constellations, and Beck said it would be capable of human spaceflight. It was to fly from Wallops Island, Virginia, from 2024. The merger with Vector put a pro forma enterprise value of $4.1 billion on Rocket Lab.',
    after: 'Rocket Lab announced Neutron and the Vector merger together on 1 March 2021. Its video “Introducing Neutron” runs through the company’s promises since 2014, then follows Beck, in a blue blazer over a white shirt, through a factory to a dinner table inside a ribbed mock-up of a fairing, with a napkin tucked into his collar. Under a silver cloche is a black Rocket Lab cap. He cuts it up, puts it through a blender, pours it into a martini glass and eats a pinch. The last cards read “We’re building a bigger rocket” and “Coming 2024”. Rocket Lab showed a reworked Neutron in December 2021; it has not flown yet, and its first flight is now no earlier than 2027. The next day he told Space.com: “I have learned my lesson, and it tasted terrible.” (The tracking shot, the takes, the pickups and the scoring are the game’s own. So is the cap on his head during the walk: in the video it waits for him under the cloche.)',
    egg: 'Clean cuts, no wasted pulses, one take. Where the bet came due: on stage at the SmallSat conference in Logan, Utah, on 6 August 2019, announcing that Electron’s first stage would be recovered, Beck said: “Unfortunately, I find myself in the position of eating my hat.”',
    watch: { url: 'https://www.youtube.com/watch?v=agqxJw5ISdk', label: '“Introducing Neutron”, on Rocket Lab’s YouTube channel (1 March 2021)' },
    sources: ['https://www.youtube.com/watch?v=agqxJw5ISdk', 'https://www.businesswire.com/news/home/20210301005406/en/Rocket-Lab-Unveils-Plans-for-New-8-Ton-Class-Reusable-Rocket-for-Mega-Constellation-Deployment', 'https://space-travel.com/rocket-lab-unveils-plans-for-bigger-reusable-rocket-for-mega-constellation-deployment-999/', 'https://www.space.com/rocket-lab-unveils-neutron-rocket-company-going-public', 'https://www.clickorlando.com/news/local/2021/03/01/rocket-lab-ceo-eats-part-of-his-hat-revealing-new-rocket-capable-of-human-spaceflight/', 'https://www.universetoday.com/articles/move-over-electron-rocket-lab-introduces-its-new-neutron-rocket', 'https://www.geekwire.com/2019/rocket-lab-will-try-helicopter-recovery-rocket-booster-ceo-will-eat-hat/', 'https://techcrunch.com/2021/03/01/rocket-lab-to-go-public-via-spac-at-valuation-of-4-1-billion/', 'https://www.space.com/rocket-lab-neutron-peter-beck-interview', 'https://www.space.com/rocket-lab-neutron-rocket-reusability-development-update', 'https://www.sec.gov/Archives/edgar/data/1819994/000181999426000074/rklb-20260930.htm'],
    params: {
      theme: 'neutron', act: 'walk', start: 30, end: 306, speed: 54, hold: 0.8, takes: 3, outMax: 1.6, frame: [0, 112, 20, 0.35],
      items: [['blazer', 78, 'The blue blazer'], ['cap', 166, 'A Rocket Lab cap'], ['blender', 252, 'The blender']],
      then: {
        mechanic: 'hat-trick',
        intro: 'The table is laid inside the mock-up of the fairing: a white cloth, a silver cloche, a plate, a martini glass. In the video Beck cuts the cap up with scissors, blends it, pours it into the glass and eats a pinch.',
        how: 'Act two, at the table. SNIP: the scissors cross the cap by themselves; ↑ ↓ keep them on the dashed line, three cuts. BLEND: Space pulses the blender. Pulse only once the pieces have fallen back onto the blades: a pulse with them in the air is wasted and heats the motor. POUR: → tips the jar over the martini glass, ← stands it back up; the pieces keep sliding out for a moment, so stand it up early and fill to the middle of the green band. TASTE: Space. Overheat the motor or overfill the glass and the scene is ruined.',
        params: { theme: 'neutron', act: 'table', cuts: [[5, 1, 0, -14], [7, 1.5, 1.2, 0], [5, 2, 2.4, 14]], snipSpeed: 30, pulses: 6, pour: { band: [0.6, 0.85], jar: 1.25 } },
      },
    },
  },
  {
    id: 'going-public', kind: 'platform', mechanic: 'platform', status: 'flown', hero: 'adam', role: 'Chief Financial Officer · 2021',
    title: 'RKLB rings the bell', date: '2021-08-25', place: 'Long Beach, California', map: { x: 607, y: 274 },
    intro: 'In March 2021 Rocket Lab announces two things at once: a merger with the SPAC Vector Acquisition Corporation, and Neutron, the bigger reusable rocket Beck had said he would never build. Going public is a paper chase, and paper is the finance chief’s department. Pandemic travel limits mean nobody is going to Times Square: on listing day the Nasdaq opening bell will be rung by video link. This level belongs to Adam Spice: carry the listing across the Long Beach headquarters and have everything at the bell before the market opens.',
    how: 'You play Adam Spice. Arrows to run, Space to jump. Collect the five things the listing needs and reach the bell. Jump on bears and rolls of red tape to see them off; wait out the red candles falling from the tickers; mind the funding gaps. Power-ups float in bubbles: the hard hat and hi-vis vest make you untouchable, and the bubble with Peter’s face brings Peter Beck in to run ahead of you and clear the way.',
    fact: 'When it was announced, the deal put an enterprise value of $4.1 billion on Rocket Lab; it brought in about $777 million of gross proceeds. Vector’s shareholders voted it through on 20 August 2021, and on 25 August the ticker VACQ became RKLB.',
    after: 'Rocket Lab began trading on the Nasdaq as RKLB on 25 August 2021, with about $777 million in new cash, much of it earmarked for Neutron. Peter Beck rang the opening bell virtually at 9:30 a.m. in New York, which was 1:30 on Thursday morning in Auckland. Adam Spice, who had joined from the chip-maker MaxLinear in May 2018, was Chief Financial Officer through the listing.',
    egg: 'The hat. Beck had said Rocket Lab would never do reusable rockets, and that he would eat his hat if it did. Electron recovery came first; in the Neutron announcement video he put a Rocket Lab cap in a blender and ate it.',
    sources: [WP + 'Rocket_Lab', 'https://www.nasdaq.com/events/rocket-lab-rings-the-opening-bell', 'https://www.cnbc.com/2021/08/25/rocket-lab-begins-trading-on-nasdaq-as-rklb-after-spac-merger.html', 'https://rocketlabcorp.com/about/team/'],
    params: {
      theme: 'listing', width: 64, buddy: 'peter',
      ground: [[0, 12, 9], [15, 28, 9], [31, 43, 9], [46, 63, 9]],
      plats: [[4, 7, 3], [18, 7, 3], [21, 5, 3], [34, 7, 3], [37, 5, 3], [49, 7, 3]],
      parts: [[5, 6, 'Merger agreement'], [19, 6, 'PIPE commitments'], [22, 4, 'Form S-4'], [38, 4, 'Shareholder vote'], [50, 6, 'RKLB ticker']],
      hazards: [], sheep: [], egg: [35, 6], goal: 60,
      enemies: [['bear', 7, 11], ['candles', 25, 25], ['redtape', 39, 42], ['candles', 48, 48], ['bear', 53, 57]],
      powerups: [['H', 16, 8], ['C', 32, 8]],
      signs: [],
    },
  },
  {
    id: 'there-and-back-again', kind: 'minigame', mechanic: 'heli-catch', status: 'flown',
    title: 'There And Back Again', date: '2022-05-03', place: 'Pacific Ocean, off Māhia', map: { x: 330, y: 300 },
    intro: 'Electron is too small to land on its engines, so the plan is wilder: let the first stage fall under a parachute, then snag the line with a hook hanging from a Sikorsky S-92 helicopter. Thirty-four satellites are already on their way to orbit. Now go and catch the booster.',
    how: 'Arrows to fly. Put the hook (bottom of your cable) on the line trailing above the parachute. You get three passes.',
    fact: 'First recovery steps came earlier: “Return to Sender” (November 2020) was the first Electron booster fished out of the ocean.',
    after: 'The helicopter caught the booster in mid-air, a first for an orbital rocket. The pilots noticed the load behaving differently from the test articles and released it, so it parachuted into the sea and a ship picked it up. Rocket Lab later dropped the helicopter in favour of ocean recovery.',
    egg: 'First-pass catch. The sequel mission was named “Catch Me If You Can”.',
    sources: [WP + 'Rocket_Lab_Electron', 'https://www.nytimes.com/2022/05/03/science/rocket-lab-helicopter-catch.html'],
  },
  {
    id: 'capstone', kind: 'minigame', mechanic: 'orbit-raise', status: 'flown',
    title: 'CAPSTONE to the Moon', date: '2022-06-28', place: 'LC-1 → lunar transfer', map: { x: 454, y: 76 },
    intro: 'NASA wants CAPSTONE, a microwave-oven-sized CubeSat owned and operated by Advanced Space, sent to the Moon to scout the orbit planned for the Gateway station. Electron cannot throw it there directly, so the Lunar Photon upper stage does it the patient way: burn the HyperCurie engine at each perigee and stretch the orbit, pass after pass.',
    how: 'Press Space as Photon sweeps through the green perigee zone. Better timing, bigger push. Stretch the orbit until it reaches the Moon before the propellant runs out.',
    fact: 'CAPSTONE weighs about 25 kg. This was Rocket Lab’s first deep-space mission, flown on a rocket you could park in a tennis court.',
    after: 'After six orbit-raising burns over six days, Photon’s seventh and final trans-lunar injection burn came on 4 July 2022 and CAPSTONE was released toward the Moon. It later entered the near-rectilinear halo orbit it was sent to test.',
    egg: 'Not a drop wasted. Every burn you made landed in the perigee zone.',
    photo: { file: 'capstone_launch.jpg', caption: 'Electron lifts off with CAPSTONE, June 2022.', credit: 'Yourong F. Wang, CC BY-SA 4.0', page: C + 'CAPSTONE-LAUNCH.jpg' },
    sources: [WP + 'CAPSTONE', WP + 'Rocket_Lab_Photon'],
  },
  {
    id: 'lc-2', kind: 'launch', mechanic: 'launch', status: 'flown',
    title: 'Virginia Is For Launch Lovers', date: '2023-01-24', place: 'LC-2, Wallops Island, Virginia', map: { x: 806, y: 240 },
    intro: 'Launch Complex 2 has stood ready on Wallops Island since December 2019, next to the Antares pad at the Mid-Atlantic Regional Spaceport. What it lacked was permission. A rocket leaving here has to carry NASA’s new autonomous flight termination unit: software that tracks the vehicle by GPS and ends the flight by itself if it strays from a pre-set corridor, with no range officer holding a button. Getting that software certified took years. Then, in December 2022, upper-level winds kept Electron on the pad night after night. After 32 launches from New Zealand, fly the first one from American soil.',
    how: 'The procedure you know, at dusk, with one more thing watching: the AFTS. The red lines on the TRAJECTORY plot are its corridor, and the read-out above the plot shows how much margin is left. Wander outside and you have a few seconds to get back before the rocket ends its own flight, so stay on the flight-director cue. (The corridor, the margin and the grace period are the game’s picture of what the real unit does.) Enter for SECO at 550 km apogee, hold Space to circularise at apogee, then release the three satellites with the DEPLOY SEQUENCE (← → to the green marker, Space when the stage is steady).',
    fact: 'Electron had carried Rocket Lab’s own autonomous flight termination system from Māhia since flight 10, “Running Out Of Fingers”, in December 2019, after four flights with it riding along in shadow mode. This was the first flight anywhere of NASA’s unit, which was fully certified on 3 March 2023.',
    after: 'Electron lifted off from Launch Complex 2 at 6:00 pm EST on 24 January 2023, about 45 minutes after sunset, and flew south-east over the Atlantic; NASA had told people along much of the East Coast that they might see it. The kick stage put three radio-frequency satellites for HawkEye 360, a Virginia company, into a 550 km orbit inclined 40.5°. It was Electron’s 33rd launch, and Rocket Lab now had pads in two hemispheres.',
    egg: 'Straight down the middle of the corridor. The mission name plays on “Virginia is for Lovers”, the state’s tourism slogan. And the wild ponies that visitors hope to see near the pad live one island over, on Assateague: Wallops Island’s own residents are nesting piping plovers.',
    sources: [RL + 'updates/rocket-lab-successfully-launches-first-electron-mission-from-u-s-soil/', 'https://www.nasa.gov/centers-and-facilities/wallops/new-nasa-safety-system-enables-rocket-lab-launch-from-wallops/', 'https://www.nasa.gov/centers-and-facilities/wallops/nasa-wallops-supports-second-rocket-lab-electron-launch', 'https://www.space.com/rocket-lab-1st-electron-launch-delayed-by-winds', 'https://spaceflightnow.com/2023/01/24/rocket-lab-primed-for-busy-year-after-first-launch-from-virginia/', RL + 'updates/rocket-lab-debuts-fully-autonomous-flight-termination-system/'],
    params: {
      vehicle: 'electron', site: 'wallops', dusk: true, afts: true, goal: { orbit: true, orbit_km: 550, inject_km: 250 }, twist: 'kick-stage', payload: 'HawkEye 360 · three satellites',
      scrub: { at: 9.5, text: 'SCRUB · 18 December 2022 · upper-level winds out of limits', resume: '24 January 2023 · new attempt · T-8' },
      deploy: ['HawkEye 360 · 1 of 3', 'HawkEye 360 · 2 of 3', 'HawkEye 360 · 3 of 3'],
    },
  },
  {
    id: 'heavens-on-sale', kind: 'card', status: 'flown',
    title: 'When the Heavens Went on Sale', date: '2023-05-09', place: 'New York · Ecco, HarperCollins', map: { x: 790, y: 222 },
    intro: 'Ashlee Vance, the journalist who wrote the bestselling biography of Elon Musk, publishes a book about the people trying to make the road to orbit cheap: <i>When the Heavens Went on Sale: The Misfits and Geniuses Racing to Put Space Within Reach</i>, from Ecco, an imprint of HarperCollins, in May 2023 (the US hardcover is dated 9 May). It follows four companies: Astra, Firefly, Planet and Rocket Lab. For the Rocket Lab story he spent time with Peter Beck in Auckland, including a day at the company’s main factory in November 2018. Bloomberg Businessweek ran an excerpt on 4 May whose headline calls Beck a “dishwasher engineer”: he started at Fisher & Paykel, where the first level of this game is set.',
    fact: 'Vance first visited Beck in Auckland in 2015, filming the first season of his Bloomberg show Hello World. By his own account he found “three rocket bodies” on the shop floor, and went back about seven times for the book and the film that followed. You can meet him in the Rosie the Robot level, where the game brings him back to the factory a year after his real visit.',
    after: '',
    diagram: { key: 'card_heavens', caption: 'Drawn for the game: the spine is not the published design. The notebook lists the four companies the book follows.' },
    sources: ['https://www.publishersweekly.com/9780062998873', 'https://www.penguin.co.uk/books/441285/when-the-heavens-went-on-sale-by-vance-ashlee/9780753557754', 'https://www.bloomberg.com/news/features/2023-05-04/peter-beck-s-rocket-lab-challenges-elon-musk-and-spacex', WP + 'Ashlee_Vance', 'https://www.iheart.com/podcast/1049-markets-with-madison-128331977/episode/untold-rocket-lab-astra-stories-197999327/'],
  },
  {
    id: 'markets-with-madison', kind: 'card', status: 'flown',
    title: 'Markets with Madison', date: '2023-05-18', place: 'NZ Herald, Auckland · Peter Beck in California', map: { x: 600, y: 248 },
    intro: 'The NZ Herald’s investment show, launched in February 2023 and hosted by the business journalist Madison Malone (then bylined Madison Reidy), puts Peter Beck on the programme. He speaks from California, where Rocket Lab is now based. They talk about Neutron, which Beck says will go “head to head” with SpaceX’s Falcon 9; about SpaceX’s Starship, which had exploded on its first test flight in April; and about Electron, which Beck calls “the most reliable small launch vehicle”.',
    fact: 'NZME says the twice-weekly show passed 1.4 million views in just over a year, with guests from the Reserve Bank governor Adrian Orr to Peter Beck. A year after this interview, Madison Malone was inside Rocket Lab’s mission control for the 50th Electron launch: meet her beside the Sir Peter card.',
    after: '',
    diagram: { key: 'card_mwm', caption: 'Drawn for the game: the studio in Auckland, Peter Beck on the line from California, and the three things they talked about.' },
    sources: ['https://www.nzherald.co.nz/business/markets-with-madison/markets-with-madison-rocket-labs-peter-beck-takes-aim-at-musks-explosion/3RSGW7C74RDRTML7BUVUEWEYPE/', 'https://www.nzme.co.nz/news/nz-herald-s-madison-reidy-makes-2024-forbes-30-under-30-asia-list'],
  },
  {
    id: 'haste', kind: 'launch', mechanic: 'launch', status: 'flown',
    title: 'Scout’s Arrow', date: '2023-06-18', place: 'LC-2, Wallops Island, Virginia', map: { x: 834, y: 226 },
    intro: 'In April 2023 Rocket Lab announces HASTE, the Hypersonic Accelerator Suborbital Test Electron: the same carbon-composite rocket and Rutherford engines, with a modified third stage, room for up to 700 kg, and no intention of reaching orbit. A hypersonic test article has to be thrown into the upper atmosphere at an exact speed, height and attitude, and that is the service on offer. Two months after the announcement the first one stands on the pad at Wallops, for a customer nobody is naming tonight. Fly it low, fast and precise, and let go at the right moment.',
    how: 'A night launch, with the AFTS corridor (red lines) watching. Stage 1 as usual. Stage 2 flies a low, flat profile: stay on the cue, jettison the fairing when heating allows, hot-swap the batteries. There is no orbit to aim for. Enter commands SECO as the SPEED reaches 6,000 m/s (↓ throttle down for a finer cut). Then coast over the top: ← → keep the white needle on the yellow velocity ring, and press Space to release the test article as the altitude falls through the 92.5–87.5 km window. You are scored on cutoff speed, release altitude and angle of attack.',
    fact: 'Rocket Lab publishes HASTE’s envelope: about 700 kg of payload, released at 80 km and up, at anything from 3 to more than 7.5 km/s, with the release attitude tailored to the test. What “Scout’s Arrow” carried and the profile it flew were never published, so the speed and altitude targets in this level are the game’s own.',
    after: 'HASTE flew for the first time at 9:24 pm EDT on 17 June 2023 (01:24 UTC on the 18th) from Launch Complex 2. On the night Rocket Lab said only that it had launched successfully for “a confidential customer”; its mission page now names Leidos and the Pentagon’s MACH-TB hypersonic test-bed programme. Five more HASTE flights followed by the end of 2025.',
    egg: 'On the number. Leidos’s chief executive, Tom Bell, said afterwards that the MACH-TB team had put this first demonstration together in 49 days (as reported by The Defense Post).',
    sources: [RL + 'missions/launches/scouts-arrow/', RL + 'launch/haste/', RL + 'updates/rocket-lab-debuts-haste-rocket-with-first-successful-suborbital-launch-from-virginia/', RL + 'updates/rocket-lab-introduces-suborbital-testbed-rocket-selected-for-hypersonic-test-flights/', RL + 'missions/launches/prometheus-run/', 'https://thedefensepost.com/2023/06/20/us-hypersonic-test-bed-leidos/', 'https://www.c4isrnet.com/battlefield-tech/space/2023/06/20/rocket-lab-launch-supports-pentagons-hypersonic-testing-push/'],
    params: { vehicle: 'haste', site: 'wallops', night: true, afts: true, goal: { inject_km: 140, v_ms: 6000, release_km: 90 }, payload: 'Test article · undisclosed' },
  },
  {
    id: 'paschens-law', kind: 'launch', mechanic: 'launch', status: 'flown',
    title: 'Paschen’s Law', date: '2023-09-19', place: 'LC-1, Māhia', map: { x: 312, y: 284 },
    intro: 'Twenty orbital missions in a row have worked. On 19 September 2023 Electron’s 41st flight, “We Will Never Desert You”, carries a radar satellite for Capella Space. Lift-off, Max-Q and stage separation go as they always do. Then the second stage lights, and seconds later it has no power at all. This level has three acts: fly flight 41 to the moment it is lost, find out in the laboratory why, and fly the return to flight.',
    how: 'Act one. Fly it as you always do: Enter holds the count, ← → on the cue, ↑ ↓ through Max-Q, Space for stage separation and stage-2 ignition. What happens next is history, not your flying.',
    fact: 'The numbers from Rocket Lab’s account: 151 seconds into the flight the second stage’s high voltage “anomalously fell sharply”, and in less than a second the stage had lost all power. It ended a run of 20 successful orbital missions in a row, and 37 Electron successes in all.',
    after: '“We Will Never Desert You” was lost on 19 September 2023, after lifting off at 06:55 UTC. In October the FAA confirmed that Rocket Lab’s launch licence remained active, the company published its findings on 8 November, and on 15 December 2023 “The Moon God Awakens” put QPS-SAR-5, TSUKUYOMI-I, into orbit for the Japanese company iQPS: 87 days from failure to flight. (The curve in the laboratory has the shape Paschen found, but its numbers are the game’s own, and the target orbits in acts one and three are not taken from Rocket Lab’s pages. The real arc came after staging, in the near-vacuum of space, where the trapped helium and nitrogen supplied the low pressure; the sweep in the laboratory is a simpler picture of that.)',
    egg: 'Not one wasted sweep. Friedrich Paschen published his law in 1889. The mission that proved the fix was named for Tsukuyomi, the Japanese god of the Moon.',
    sources: [RL + 'updates/rocket-lab-sets-next-electron-launch-window-provides-update-on-anomaly-review/', RL + 'updates/rocket-lab-receives-federal-aviation-administration-authorization-to-resume-launches/', RL + 'missions/launches/we-will-never-desert-you/', RL + 'missions/launches/the-moon-god-awakes/', WP + 'Paschen%27s_law'],
    params: {
      vehicle: 'electron', site: 'mahia', dusk: true, goal: { orbit: true, orbit_km: 500 }, twist: 'scripted-loss', payload: 'Acadia · Capella Space',
      then: {
        mechanic: 'arc-lab',
        intro: 'Seven weeks later Rocket Lab publishes what its review found. An electrical arc formed inside the power supply that feeds the Rutherford motor controllers, and shorted the battery packs. An arc should not have been able to form there. Why it could is a piece of nineteenth-century physics, Paschen’s Law: a gas resists a spark well at ordinary pressure and well in a vacuum, and worst somewhere in between.',
        how: 'Act two. The plot shows the voltage at which the gas in a gap breaks down (the curve) against pressure, and the voltage on the harness (the blue line). ← → choose a condition, Space switches it on or off, ↑ ↓ change the pressure by hand, and Enter runs an ascent sweep from sea level to vacuum. Work down the list: make it arc, show that each of the three conditions is needed, then show that the fix holds. The fewer sweeps, the more stars.',
        params: {
          heading: 'ANOMALY REVIEW · FLIGHT 41 · HIGH-VOLTAGE LOOM', dc: 200, ripple: 60, vmin: [330, 230],
          switches: [['ripple', 'AC RIPPLE from the motor controllers', 'the AC ripple'], ['gas', 'HELIUM + NITROGEN in the interstage', 'the helium and nitrogen'], ['fault', 'INSULATION FAULT in the HV loom', 'the insulation fault'], ['fix', 'SEALED BATTERY FRAME holds its pressure', '']],
          botPlan: [['ripple', 'gas', 'fault'], ['gas', 'fault'], ['ripple', 'fault'], ['ripple', 'gas'], ['ripple', 'gas', 'fault', 'fix']],
          then: {
            mechanic: 'launch',
            intro: 'Rocket Lab’s findings, as it published them: an AC ripple from the motor controllers riding on the DC supply; a small concentration of helium and nitrogen in the interstage; and “an imperceptible fault in the insulation of the high voltage loom”. Its fixes: tests with more margin and flight-like voltage waveforms, and a battery frame modified to hold its pressure from launch until the kick stage separates. On 15 December 2023 Electron is back on the pad, with a radar satellite for iQPS.',
            how: 'Act three: “The Moon God Awakens”. The whole procedure, start to finish: call the count, fly the cue, throttle through Max-Q, command each event, Enter for SECO at 575 km apogee, then hold Space to circularise with Curie at apogee and Enter to deploy.',
            params: { vehicle: 'electron', site: 'mahia', goal: { orbit: true, orbit_km: 575 }, twist: 'kick-stage', payload: 'QPS-SAR-5 · TSUKUYOMI-I' },
          },
        },
      },
    },
  },
  {
    id: 'beginning-of-the-swarm', kind: 'launch', mechanic: 'launch', status: 'flown',
    title: 'Beginning Of The Swarm', date: '2024-04-23', place: 'LC-1, Māhia', map: { x: 310, y: 240 },
    intro: 'One rocket, two customers, and they want to be 480 kilometres apart. NEONSAT-1, an Earth-observation satellite from Korea’s KAIST and the first of a planned constellation of eleven, is going to 520 km. NASA’s Advanced Composite Solar Sail System, a spacecraft that Rocket Lab described as about the size of a toaster, with a sail to unfurl, needs to be far higher, at 1,000 km, where there is almost no air left to drag on it. So the kick stage has a busy day: Curie will be lit four times.',
    how: 'Fly the ascent as before: Enter holds the count, ← → on the cue, ↑ ↓ through Max-Q, Space for each event, Enter for SECO at 520 km apogee. Then the kick stage follows the FLIGHT PLAN listed on the left. Hold Space to burn; Enter confirms each step once the engine is off. Circularise at 520 km and release NEONSAT-1. Burn again until the apogee reads 1,000 km, coast up to it, circularise there, and release the solar sail. Last, the de-orbit burn: the stage turns round and Curie fires against the direction of travel to pull the perigee down, so the empty stage comes home sooner. Three stars for both payloads within 15 km of their orbits and the stage brought down.',
    fact: 'Rocket Lab’s plan for the day listed four Curie ignitions: one to circularise for NEONSAT-1, one to raise the apogee to 1,000 km, a third to circularise there, and a fourth for the de-orbit burn. It wrote the mission name with its initials alongside, B.T.S, and left it at that.',
    after: 'Electron lifted off at 10:32 am NZST on 24 April 2024 (22:32 UTC on the 23rd), its 47th launch. Rocket Lab reported NEONSAT-1 delivered to a 520 km circular orbit and the solar sail to 1,000 km, followed by a final engine light for the de-orbit manoeuvre. Space.com timed the first deployment about 50 minutes after lift-off and the second 55 minutes after that. (How low the de-orbit burn took the stage was not published: the 500 km in this level is a game value, and so are the payload masses.)',
    egg: 'On the numbers, twice. NASA’s solar-sail spacecraft was, in Rocket Lab’s words, about the size of a toaster, and its sail about the size of a small apartment: roughly 30 feet a side.',
    sources: [RL + 'updates/rocket-lab-successfully-deploys-satellites-500km-apart-to-separate-orbits-for-kaist-and-nasa/', RL + 'updates/rocket-lab-prepares-to-launch-mission-for-kaist-and-nasa-to-deploy-satellites-to-two-separate-orbits/', 'https://www.space.com/rocket-lab-nasa-solar-sail-tech-launch-april-2024'],
    params: {
      vehicle: 'electron', site: 'mahia', goal: { orbit: true, orbit_km: 520, inject_km: 250 }, twist: 'kick-stage', payload: 'NEONSAT-1 + NASA solar sail',
      plan: [{ do: 'circ', alt: 520 }, { do: 'deploy', name: 'NEONSAT-1', mass: 110 }, { do: 'raise', alt: 1000 }, { do: 'circ', alt: 1000 }, { do: 'deploy', name: 'ACS3 solar sail', mass: 50 }, { do: 'lower', alt: 500 }],
    },
  },
  {
    id: 'sir-peter', kind: 'card', status: 'flown',
    title: 'Sir Peter', date: '2024-06-03', place: 'Aotearoa New Zealand', map: { x: 187, y: 300 },
    intro: 'In the 2024 King’s Birthday Honours, the apprentice toolmaker from Invercargill is made a Knight Companion of the New Zealand Order of Merit, for services to the aerospace industry, business and education. He is invested on 5 September 2024. In the month of the honours list Electron flies its 50th mission, “No Time Toulouse”.',
    fact: 'Eighteen days after the honours list, Electron flew its 50th mission, “No Time Toulouse”: that morning in Rocket Lab’s mission control in Auckland is the next level, with Madison Malone of the NZ Herald alongside. Meet her beside this card.',
    after: '',
    photo: { file: 'beck_knzm.jpg', caption: 'Sir Peter Beck KNZM at his investiture.', credit: 'New Zealand Government, Office of the Governor-General, CC0', page: C + 'Peter_Beck_KNZM_(cropped).jpg' },
    sources: [WP + 'Peter_Beck', WP + 'List_of_Electron_launches', 'https://www.nzherald.co.nz/hawkes-bay-today/news/behind-rocket-labs-50th-launch-realising-sir-peter-becks-dream/HXA325VFNVGKNOPYIN4ZNRIOHU'],
  },
  {
    id: 'no-time-toulouse', kind: 'platform', mechanic: 'platform', status: 'flown', role: 'Founder and CEO · 2024', unlocks: 'five-for-five',
    title: 'No Time Toulouse', date: '2024-06-20', place: 'Rocket Lab mission control, Mount Wellington, Auckland', map: { x: 196, y: 201 },
    intro: 'Friday 21 June 2024, the morning of the June solstice in New Zealand, and more than an hour before sunrise. Electron’s 50th flight, “No Time Toulouse”, is due to lift off from Launch Complex 1 on the Māhia Peninsula at 6:13 a.m., with five satellites for Kinéis, an Internet-of-Things company based in Toulouse. The count runs from Rocket Lab’s mission control in Auckland, and despite the hour the company’s present and past staff and their families are rolling in to watch it. So is the NZ Herald’s investment show <i>Markets with Madison</i>, which Rocket Lab has given exclusive access to the room. Its name is a pun on “no time to lose” and on Toulouse. Walk in from the street, through the building, and be in the room with what the count needs before T−0.',
    how: 'Arrows to run, Space to jump. Collect the five things the count needs and reach mission control. New here: the access doors. Each one opens only now and then, as somebody badges through: wait for it, or bring Madison Malone, whose access opens every door as you reach it. The clock at the top is the count: be in the room before T−0 for three stars. Jump on the runaway alarm clocks and the boxes of black merch, and keep clear of the ruru, the night owl, out on the street. Power-ups float in bubbles: warm winter layers make you untouchable, and the kick stage gives you a second jump in mid-air (press Space again). The bubble with Madison’s face brings her along for 30 seconds: Enter starts her camera rolling, and whatever is in front of the lens gets out of the shot. A hidden blueprint unlocks a secret on the map.',
    fact: 'Rocket Lab’s numbers for the day: its 50th Electron launch, seven years after the first in May 2017, which it says is faster than any commercially developed rocket in history; 190 satellites deployed across those 50 launches; and this one, the first of five dedicated launches for Kinéis, carried five satellites to a 635 km circular orbit. The Kinéis satellites connect and locate objects anywhere on Earth, for jobs from detecting forest fires to tracking freight.',
    after: 'Electron lifted off from Pad B at Launch Complex 1 at 6:13 a.m. NZST on 21 June 2024 (18:13 UTC on the 20th) and deployed all five Kinéis satellites to their 635 km orbit, in singles and in pairs. In mission control, by Madison Malone’s report for the NZ Herald, published on 23 June, the count ended in cheering, applause, handshakes and back pats; the integrated operations manager, Michael Pearson, who had been there for every Electron launch, had been at mission control since 9 p.m. the night before. Her report quotes Peter Beck but does not say where he watched from, so walking him in, and the console he stops at, are the game’s own, and so are the doors, the clock and the camera Madison carries. The satellites were deployed about an hour after lift-off; the big screen in the level runs that hour together. Kinéis’s other four launches followed, the last of them in March 2025.',
    egg: 'The Moon, all but full. At lift-off it hung low in the south-west over Auckland, 99.5% lit, and it set 27 minutes later, at 6:40; it was full the next afternoon. And the June solstice fell at 8:50 that morning: Electron’s 50th flew on the shortest day of the year.',
    sources: [RL + 'updates/rocket-lab-successfully-launches-50th-electron-mission-deploys-satellites-for-kineis/', RL + 'missions/launches/no-time-toulouse/', 'https://www.nzherald.co.nz/hawkes-bay-today/news/behind-rocket-labs-50th-launch-realising-sir-peter-becks-dream/HXA325VFNVGKNOPYIN4ZNRIOHU', 'https://www.nzherald.co.nz/business/markets-with-madison-rocket-lab-50th-launch/LCFMUJKIRZCKUGCBJEPMM54WYY', 'https://spaceflightnow.com/2024/06/20/live-coverage-rocket-lab-to-launch-50th-electron-rocket/', WP + 'List_of_Electron_launches', RL + 'updates/the-future-of-rocket-manufacturing-rocket-lab-unveils-new-high-volume-production-facility/', 'https://architecturenow.co.nz/articles/ground-control-rocket-lab', 'https://www.timeanddate.com/sun/new-zealand/auckland?month=6&year=2024', 'https://www.timeanddate.com/moon/new-zealand/auckland?month=6&year=2024', 'https://www.doc.govt.nz/nature/native-animals/birds/birds-a-z/morepork-ruru/', 'https://www.space.com/rocket-lab-50th-mission-launch-kineis-iot-satellites'],
    params: {
      theme: 'control', width: 84, buddy: 'madison',
      ground: [[0, 13, 9], [16, 39, 9], [40, 55, 10], [56, 83, 9]],
      plats: [[4, 7, 3], [7, 5, 2], [18, 7, 3], [21, 5, 3], [33, 7, 3], [36, 5, 3], [48, 8, 3], [51, 6, 3], [66, 7, 3], [69, 5, 3]],
      doors: [26, 59],
      parts: [[5, 6, 'Media access pass'], [22, 4, 'The count: lift-off at 06:13 NZST'], [37, 4, 'Five Kinéis satellites on the manifest'], [52, 5, 'The target: 635 km circular'], [70, 4, 'The feed from Launch Complex 1']],
      hazards: [], sheep: [], egg: [8, 4], goal: 80,
      enemies: [['merch', 18, 21], ['ruru', 11, 16], ['alarm', 29, 33], ['alarm', 41, 44], ['merch', 62, 65], ['alarm', 75, 78]],
      powerups: [['C', 2, 8], ['W', 31, 8], ['U', 40, 8]], secret: [46, 1],
      signs: [],
    },
  },
  {
    id: 'wild-wild-space', kind: 'card', status: 'flown',
    title: 'Wild Wild Space', date: '2024-07-17', place: 'HBO and Max', map: { x: 380, y: 268 },
    intro: 'Ashlee Vance’s book becomes a documentary. Directed by Ross Kauffman, <i>Wild Wild Space</i> has its world premiere at the DC/DOX festival in Washington on 14 June 2024 and arrives on HBO and Max on 17 July. It tells the race to put small satellites in orbit through three founders: Astra’s Chris Kemp, Planet’s Will Marshall and Peter Beck, who appears in the HBO documentary as the engineer from New Zealand with very different ideas from Kemp’s about how to build a rocket company.',
    fact: 'Ross Kauffman had already won an Academy Award, for the documentary <i>Born into Brothels</i> (2004). Vance is one of the film’s producers, and four days after it reached HBO he was a guest on <i>Markets with Madison</i>, the show from the May 2023 card, telling the story behind it.',
    after: '',
    diagram: { key: 'card_wws', caption: 'Drawn for the game, with none of the film’s artwork. On the strip: the three companies it follows.' },
    sources: ['https://dcdoxfest.com/films/wild-wild-space/', WP + 'Wild_Wild_Space', 'https://techcrunch.com/2024/07/11/wild-wild-space-doc-captures-the-risks-and-rivalries-of-the-new-space-race/', WP + 'Ross_Kauffman'],
  },
  {
    id: 'four-channels', kind: 'minigame', mechanic: 'edit-bay', status: 'flown', role: 'The edit desk · a game role',
    title: 'Four channels, one call', date: '2024-08-11', place: 'YouTube · four channels', map: { x: 410, y: 244 },
    intro: 'On 8 August 2024 Rocket Lab reports its second-quarter results and holds its conference call for investors at 2 p.m. Pacific. Afterwards four YouTube creators who follow the company, Vince of Vince is Bullish, Dave G of Dave G Investing, Matt Farley of MattMoney and Scott O, interview Sir Peter Beck and the chief financial officer, Adam Spice, and share the conversation out: four parts, one on each creator’s channel, each pointing to the other three. In this level you are the edit desk, a role the game invents: cut the recording into its four parts and get each one to the right channel before it goes live, then put the whole interview back together.',
    how: 'Act one, Sunday 11 August. The whole recording is on the tape. ← → scrub along it (hold to go faster; let go and the view zooms in) and Space cuts at the yellow line. Cut in the quiet gap where one creator’s turn ends and the next begins: the faces above the waveform show who is asking. Each finished part drops into the OUT tray: ↑ ↓ choose the channel with the same face, and Enter sends it. The channels sit in a different order every time. Uploads running at once share one connection. Enter on a channel that has a part pulls it back; Enter on a STALLED upload retries it. A sticky note on the tape is the chapter list (the game borrows it from Scott O’s full cut, two days early): Space on it and your next cut snaps to the break. Act two, Tuesday 13 August: splice the parts back into the full interview, in order, and send it to every channel before each one goes live. Three stars for every video on the right channel and on time, with every cut in its gap.',
    fact: 'The four parts went up within twenty minutes of each other. YouTube dates parts 1 to 3 to 3 p.m. Pacific on Sunday 11 August, which was midnight in Amsterdam and already 10 a.m. on Monday 12 August in New Zealand; Scott O’s part 4 followed at 3:20. Each description sends viewers on to the other channels, in order: part 1 Vince, part 2 Dave, part 3 Matt, part 4 Scott.',
    after: 'The four parts went live on 11 August Pacific time (12 August in continental Europe and New Zealand): part 1 on Vince is Bullish (11 min 32 s), part 2 on Dave G Investing (12 min 41 s), part 3 on MattMoney (14 min 2 s) and part 4 on Scott O (15 min 29 s). On 13 August, Pacific time, each channel posted the whole interview as a full cut: Dave G and MattMoney at 3 p.m., Vince at 4 p.m. and Scott O at 4:02. Scott O’s full cut marks each creator’s turn in its chapters: Vince from 0:54, Dave from 10:35, Matt from 21:16 and Scott from 30:54, with the wrap-up at 45:21. (In the game one edit desk does all the work; in reality each creator posted on his own channel. The speaker strip on the tape is a picture, not a transcript, and the upload speeds, the stalls and the pace of the clock are the game’s own.)',
    egg: 'On the frame, every time. Your cuts fall where Scott O’s full cut puts its chapter marks: 10:35, 21:16 and 30:54. And from the results release the interview followed, dated 8 August 2024: Rocket Lab reported the first hot fire of Archimedes, Neutron’s engine, and that both of NASA’s ESCAPADE spacecraft were finished. Both are levels in this game.',
    diagram: { key: 'cast_q2_2024', caption: 'Drawn for the game; no photos are used. The four creators in the order of their parts, and their two guests. Meet each creator beside this node.' },
    watch: { url: 'https://www.youtube.com/watch?v=JEOcyOo77Po', label: '“Complete Interview: Rocket Lab &amp; The Space Industry With Peter Beck”, on Dave G Investing’s channel (YouTube). The other full cuts and the four parts are in the sources.' },
    sources: ['https://investors.rocketlabcorp.com/events/event-details/second-quarter-2024-financial-results-update-and-conference-call', 'https://www.sec.gov/Archives/edgar/data/1819994/000095017024094034/rklb-ex99_1.htm', 'https://www.youtube.com/watch?v=QIIcZ0MK0_A', 'https://www.youtube.com/watch?v=JEOcyOo77Po', 'https://www.youtube.com/watch?v=BKIOvo_jYC8', 'https://www.youtube.com/watch?v=LpUnlXgn4dw', 'https://www.youtube.com/watch?v=nYirK_3WRYA', 'https://www.youtube.com/watch?v=dfIHhLd9Wjs', 'https://www.youtube.com/watch?v=WAoYVU3pnXY', 'https://www.youtube.com/watch?v=fzIBsEy4BU8'],
    params: {
      theme: 'q2-2024', mode: 'parts', grace: 60, bandwidth: 50,
      clock: { date: '2024-08-11', start: 13 * 60, rate: 0.36, zones: [['LOS ANGELES', 'PDT', 0], ['AMSTERDAM', 'CEST', 9], ['AUCKLAND', 'NZST', 19]] },
      // the tape runs from Vince's first question to the wrap-up, on the timeline of Scott O's full cut; the cuts are its chapter marks
      tape: { from: 54, to: 2721, marks: [635, 1276, 1854] },
      guests: ['', 'a'], // Peter Beck and Adam Spice
      parts: [{ who: 'cv' }, { who: 'cd' }, { who: 'cm' }, { who: 'cs' }],
      channels: [
        { name: 'Vince is Bullish', handle: '@vinceisbullish', chip: 'cv', part: 0, due: 15 * 60 },
        { name: 'Dave G Investing', handle: '@daveginvesting', chip: 'cd', part: 1, due: 15 * 60 },
        { name: 'MattMoney · Matt Farley', handle: '@RealMattMoney', chip: 'cm', part: 2, due: 15 * 60 },
        { name: 'Scott O', handle: '@scotto2050', chip: 'cs', part: 3, due: 15 * 60 + 20 },
      ],
      notes: [330], hiccups: [[13 * 60 + 25, 1], [13 * 60 + 50, 3]],
      then: {
        mechanic: 'edit-bay',
        intro: 'Tuesday 13 August, Pacific time. Two days after the parts, each creator posts the whole interview on his own channel as a full cut. The four parts are back in the bin, and the full cuts go live at different times: Dave G Investing and MattMoney at 3 p.m., Vince is Bullish at 4 p.m. and Scott O at 4:02.',
        how: 'Act two. ← → choose a part in the bin and Space splices it onto the full cut: in order, part 1 first. Once the full cut has rendered, ↑ ↓ choose a channel and Enter starts its upload. Every upload running at once shares the connection, so four at once each go at a quarter of the speed: start the channels that go live first. Enter on a running upload pauses it; Enter on a STALLED one retries it.',
        params: {
          theme: 'q2-2024', mode: 'full', grace: 90, bandwidth: 93, render: 8,
          clock: { date: '2024-08-13', start: 13 * 60 + 30, rate: 0.3, zones: [['LOS ANGELES', 'PDT', 0], ['AMSTERDAM', 'CEST', 9], ['AUCKLAND', 'NZST', 19]] },
          parts: [{ who: 'cv', len: 692 }, { who: 'cd', len: 761 }, { who: 'cm', len: 842 }, { who: 'cs', len: 929 }], // the parts as posted, in seconds
          channels: [ // each full cut as posted: when it went live (Pacific) and how long it runs
            { name: 'Dave G Investing', handle: '@daveginvesting', chip: 'cd', part: 0, due: 15 * 60, len: 2838 },
            { name: 'MattMoney · Matt Farley', handle: '@RealMattMoney', chip: 'cm', part: 0, due: 15 * 60, len: 2748 },
            { name: 'Vince is Bullish', handle: '@vinceisbullish', chip: 'cv', part: 0, due: 16 * 60, len: 2830 },
            { name: 'Scott O', handle: '@scotto2050', chip: 'cs', part: 0, due: 16 * 60 + 2, len: 2784 },
          ],
          hiccups: [[14 * 60 + 5, 0]],
        },
      },
    },
  },
  {
    id: 'space-billionaire', kind: 'card', status: 'flown',
    title: 'Forbes counts a billionaire', date: '2024-11-15', place: 'Forbes estimate', map: { x: 440, y: 214 },
    intro: 'In November 2024 Forbes estimated Peter Beck’s fortune at US$1 billion for the first time, after Rocket Lab’s share price rose. The estimate counted his stake of roughly 10% in the company, plus money from shares he had sold over the years.',
    fact: 'Forbes’s write-up describes a self-taught engineer who skipped university and started out as an apprentice at the appliance maker Fisher & Paykel: the workshop in the first level of this game.',
    after: '',
    diagram: { key: 'card_forbes', caption: 'Drawn for the game, with none of Forbes’s artwork: what the estimate counted.' },
    sources: ['https://www.forbes.com/sites/mattdurot/2024/11/15/rocket-labs-founder-peter-beck-just-became-the-worlds-newest-space-billionaire/'],
  },
  {
    id: 'two-hemispheres', kind: 'minigame', mechanic: 'dual-count', status: 'flown',
    title: 'Two Hemispheres', date: '2024-11-24', place: 'LC-2, Wallops and LC-1, Māhia', map: { x: 480, y: 236 },
    intro: 'Rocket Lab has two launch sites on opposite sides of the world and, in November 2024, a launch due from each. At Wallops a HASTE suborbital mission, “HASTE A La Vista”, is counting down to one o’clock in the morning. At Māhia, where it is already the following evening, an Electron with five satellites for the French company Kinéis is a day from flight. One company, one pair of hands, two counts.',
    how: 'Two consoles. Calls come up on each with a timer. Answer a green GO with that console’s key: ← for LC-2 on the left, → for LC-1 on the right. Answer a red NO-GO with ↓, to call a hold: saying go to a NO-GO, or letting it time out, costs a full recycle. Every missed call slips that pad’s count by 20 minutes. The NEXT line under each console shows what is coming. Get both rockets away inside 24 hours to pass; three stars for answering every call in time.',
    fact: 'The real gap was 21 hours 55 minutes. “HASTE A La Vista” left Launch Complex 2 at 06:00 UTC on 24 November 2024, and “Ice AIS Baby” left Launch Complex 1 at 03:55 UTC on the 25th. Rocket Lab called it a company record for turnaround between launches, from two pads in two hemispheres.',
    after: '“Ice AIS Baby” lifted off at 4:55 pm NZDT on 25 November 2024 and put five satellites into a 643 km orbit for Kinéis: the third of five dedicated launches for the French company, Electron’s 56th launch overall and its fourteenth of that year. “HASTE A La Vista” was Rocket Lab’s second HASTE mission, flown under the MACH-TB hypersonic test programme. (The individual calls and holds in this level are the game’s own, and the day between the launches is compressed.)',
    egg: 'Every call, on time. With this launch Kinéis had fifteen satellites in orbit.',
    sources: [RL + 'updates/rocket-lab-successfully-launches-two-missions-in-less-than-24-hours/', RL + 'missions/launches/haste-a-la-vista/'],
    params: {
      theme: 'twopads', length: 58, gap_h: 21 + 55 / 60, dates: ['24 NOV 2024', '25 NOV 2024'],
      clock: [[0, 5.0], [10, 6.0], [17, 6.4], [32, 26.7], [42.5, 27.9167], [58, 28.9]],
      sides: [
        { name: 'LC-2 · WALLOPS', label: 'LC-2', mission: 'HASTE A La Vista · suborbital', site: 'wallops', tz: -5, day: [6.9, 16.8], liftoff: 10 },
        { name: 'LC-1 · MĀHIA', label: 'LC-1', mission: 'Ice AIS Baby · five satellites', site: 'mahia', tz: 13, day: [5.8, 20.3], liftoff: 42.5 },
      ],
      calls: [
        [1.5, 0, 'go', 'Propellant load complete?'], [3.0, 1, 'go', 'Roll Electron out to the pad'], [4.6, 0, 'go', 'Range clear for launch?'], [6.0, 1, 'go', 'Raise Electron to vertical'], [6.9, 0, 'nogo', 'Vessel in the hazard area'], [8.7, 0, 'go', 'Go for terminal count'], [9.4, 1, 'go', 'Pad checks complete?'],
        [11.6, 0, 'go', 'Stage separation confirmed'], [12.4, 1, 'nogo', 'Ground helium pressure low'], [13.5, 0, 'go', 'Stage 2 ignition confirmed'], [14.9, 0, 'go', 'Fairing jettison confirmed'], [15.6, 1, 'go', 'Resume pad checks'], [17.2, 0, 'go', 'Mission complete · call it'],
        [19.5, 0, 'go', 'Safe the pad'], [21, 1, 'go', 'Launch readiness review: go?'], [23, 0, 'go', 'Hand the range back'], [25, 1, 'go', 'Team rested and on console?'], [27.5, 0, 'go', 'Flight data to the customer'], [29.5, 1, 'go', 'Weather brief: go?'],
        [32, 1, 'go', 'Load propellants'], [33.4, 0, 'go', 'Stand the LC-2 team down'], [35, 1, 'nogo', 'Gusts over the limit'], [37.4, 1, 'go', 'Range clear for launch?'], [39, 0, 'go', 'Close out the LC-2 record'], [40.6, 1, 'go', 'Go for terminal count'],
        [44, 1, 'go', 'Stage separation confirmed'], [45.6, 1, 'go', 'Fairing jettison confirmed'], [47.4, 1, 'go', 'Curie ignition confirmed'], [49.5, 1, 'go', 'Satellite 1 away'], [50.9, 1, 'go', 'Satellite 2 away'], [52.3, 1, 'go', 'Satellite 3 away'], [53.7, 1, 'go', 'Satellite 4 away'], [55.1, 1, 'go', 'Satellite 5 away'],
      ],
    },
  },
  {
    id: 'outback-delivery', kind: 'minigame', mechanic: 'orbit-ops', status: 'flown',
    title: 'Outback Delivery', date: '2025-02-27', place: 'Low Earth orbit → Koonibba, South Australia', map: { x: 44, y: 262 },
    intro: 'Varda Space Industries makes things in orbit that are hard to make on the ground, starting with pharmaceutical crystals, and needs a way to bring them home. Its capsule rides on a Rocket Lab spacecraft, Pioneer, which supplies the power, communications, propulsion and pointing, and at the end of the mission has one last job: to put a 120 kg capsule on a path that ends at a chosen spot on Earth. The first capsule, in 2024, came down in Utah. The second, in February 2025, is aimed at the Koonibba Test Range in South Australia, and you are flying Pioneer.',
    how: 'The map shows where Pioneer is over the Earth and where it is heading. Hold Space to burn; the spacecraft points itself the right way for each step, and a ring on the track shows where each burn belongs. First, lower the perigee to 300 km. Half an orbit later, at the low point, raise the apogee to 900 km. Then, at the high point of the pass that crosses the range, the de-orbit burn: a cross appears where the capsule would land, and the longer you burn, the sooner it comes down along the track. Stop when the cross reaches the range. Last, press Space to release the capsule as the altitude falls through 470 km. Three stars for a landing within 70 km.',
    fact: 'Rocket Lab’s description of the real sequence: three propulsion manoeuvres, starting from a 500 km circular orbit, dropping the perigee to 300 km, raising the apogee to 900 km, and releasing Varda’s capsule from about 470 km. Varda’s own team took it from there: parachute, touchdown and recovery. (Rocket Lab counts the release as part of the third burn; the game splits it into a de-orbit burn and a release.)',
    after: 'The capsule of Varda’s W-2 mission was set on its way home at 1:52 pm UTC on 27 February 2025 and landed at the Koonibba Test Range after six weeks in orbit. Southern Launch operates the range, and consulted the Koonibba Community Aboriginal Corporation before developing it on the community’s land. The next Pioneer, for W-3, launched fifteen days later and came back to Koonibba that May. (The ground track, the wait for the right pass and the landing accuracy in this level are a simplified picture; the orbit’s inclination and the thrust are game values.)',
    egg: 'Bullseye. The first of these missions had a longer wait: W-1 was designed for four months in orbit and stayed up for more than eight before its capsule came down in Utah in February 2024, at more than Mach 25, carrying crystals of the drug ritonavir.',
    sources: [RL + 'updates/touchdown-for-in-space-manufacturing-mission-rocket-labs-pioneer-spacecraft-delivers-re-entry-for-vardas-in-space-manufacturing-capsule-in-south-australia/', RL + 'updates/rocket-lab-successfully-returns-spacecraft-capsule-to-earth-brings-back-pharmaceuticals-made-in-space/', RL + 'updates/two-earth-return-missions-in-two-months-rocket-lab-demonstrates-rapid-re-entry-capability-with-third-pioneer-spacecraft-for-varda-space-industries/', 'https://www.varda.com/mission/w-1', WP + 'Koonibba_Test_Range'],
    params: { theme: 'varda', orbit: { alt_km: 500, inc_deg: 97.5 }, thrust: 0.42, target: { name: 'KOONIBBA TEST RANGE', lat: -31.9, lon: 133.4 }, steps: [{ do: 'lower', alt: 300 }, { do: 'raise', alt: 900 }, { do: 'deorbit' }, { do: 'release', alt: 470 }] },
  },
  {
    id: 'return-on-investment', kind: 'minigame', mechanic: 'fit-out', status: 'in-progress', hero: 'shaun', role: 'Vice President, Neutron',
    title: 'Return On Investment', date: '2025–2026', place: 'Amelia, Louisiana', map: { x: 708, y: 298 },
    intro: 'Rocket Lab describes two ways home for Neutron’s first stage: a landing on a barge far out in the Atlantic, for missions that need everything the rocket has, and a return to Launch Complex 3 in Virginia. On 27 February 2025 it shows what that barge will be: a 400-foot deck barge, the Oceanus, supplied by Canal Barge of New Orleans and renamed Return On Investment. On 10 July it announces that Bollinger Shipyards has the contract for the fit-out, already begun, mainly at Bollinger’s yard in Amelia, Louisiana, to a design led by Rocket Lab. The announcement quotes Rocket Lab’s Vice President for Neutron, Shaun D’Mello, and lists what the barge needs: thrusters to hold its position, blast shielding for the equipment on deck, and autonomous gear to capture and secure the stage. By May 2026 the thrusters and the power generation that drives them have reached the yard. In this level you put them aboard. (You play D’Mello. No account places him at the yard, where the work is Bollinger’s; the game does.)',
    how: 'Act one, the yard crane. ← → run the trolley along the gantry, ↑ ↓ hoist and lower, Space hooks on and sets down. Lower the hook onto a load on the quay, hook on, lift it well clear, and carry it to its outline on the deck. The load swings when the trolley starts and stops: ease off early and let it settle, because a load only goes down when it is over its mark, touching the deck, and steady. The barge trims as the weight goes on: with too much at one end she will take no more there until the other end is loaded, so work both ends. The blast shield goes over the power generation. Three stars for no more than one knock, inside five minutes. Act two is a thruster trial.',
    fact: 'Return On Investment is 400 ft (122 m) long. On the May 2026 results call Peter Beck put the finished platform at more than 11 million pounds, or 5,000 tonnes, with 10 megawatts of power generation across four station-keeping thrusters. Rocket Lab says it will work out of the US East Coast, carrying first stages back to Wallops Island, and that it is Jones Act compliant, as American law requires of a vessel carrying cargo between places in the United States.',
    after: 'The story so far. Rocket Lab revealed Return On Investment on 27 February 2025, and on 10 July 2025 announced that Bollinger Shipyards had the contract and that the work had begun, with delivery then expected in early 2026. On the May 2026 results call Peter Beck said the thruster housings and the main cabin were installed, that the power generation systems and the thrusters had arrived at the yard, and that sea trials were on track to start later in the year. The barge is not meant for Neutron’s first flight: that one is to end in an intentional soft splashdown, and if the re-entry goes well the barge goes under the stage on flight two. Beck, on that call: “I do not want to put the barge under the vehicle until we know that we are not going to punch a hole through it.” As of November 2026 Rocket Lab has not announced the barge’s delivery or the start of sea trials, Neutron’s first flight is no earlier than 2027, and nothing has landed on the barge. (The gantry crane, the weights, the order of the lifts, the power generation as a single unit, the old name still on the hull and its repainting, and the whole trial are the game’s own. Shaun D’Mello is Rocket Lab’s Vice President for Neutron; no account places him at the yard, and the work there is Bollinger’s.) This level gets its next act when a Neutron comes home to it.',
    egg: 'Oceanus. The barge’s first name belongs to a Titan: in Greek myth Oceanus was the great river that ran round the whole world. Rocket Lab’s own announcement tells that story before giving the barge the name it will work under.',
    sources: [RL + 'updates/rocket-lab-reveals-ocean-platform-for-neutron-rocket-landings-at-sea/', RL + 'updates/rocket-lab-selects-bollinger-shipyards-to-support-modification-of-neutron-landing-platform/', RL + 'launch/neutron/', 'https://www.fool.com/earnings/call-transcripts/2026/05/08/rocket-lab-rklb-q1-2026-earnings-transcript/', 'https://aerospaceamerica.aiaa.org/features/rocket-labs-next-step/', 'https://www.nasaspaceflight.com/2026/07/rocket-lab-update-072026/', 'https://www.sec.gov/Archives/edgar/data/1819994/000181999426000073/rklb-11092026ex991.htm'],
    params: {
      theme: 'amelia', act: 'lift', hull: { was: 'OCEANUS', name: 'RETURN ON INVESTMENT', cabin: -0.93 }, trim: 3.4, trimAngle: 0.011, par: 300, maxKnocks: 8, items: ROI_ITEMS,
      then: {
        mechanic: 'fit-out',
        intro: 'With its thrusters aboard, the barge can do the one thing a landing platform must: stay where it is put. In May 2026 Rocket Lab said sea trials were on track to start later in the year; it has not said since whether they have begun, or what they involve. This trial, in the water beside the yard, is the game’s own.',
        how: 'The yard from above, the quay on the left. ← ↑ ↓ → thrust that way: the thrusters swing round together, and take a moment to answer. Space twists the hull anticlockwise, Enter clockwise. Bring the barge into each dashed box, pointing the way the box points, and hold her there until the ring fills. She is heavy: nothing stops a slide but a push the other way. The windsock shows what is pushing on her. Three stars inside 1 min 30 s, without touching the quay.',
        params: {
          theme: 'amelia', act: 'trial', hull: { name: 'RETURN ON INVESTMENT', cabin: -0.93 }, items: ROI_ITEMS, start: [99, 70], box: 7, deg: 7, par: 90, limit: 300,
          steps: [
            { say: 'Lines off. Thrust away from the quay (→) and bring her into the first box.', at: [126, 104], hdg: 0, hold: 4 },
            { say: 'A breeze pushes her back towards the quay. Hold the box against it.', at: [126, 104], hdg: 0, hold: 7, wind: [-3.4, 0, 0.5] },
            { say: 'Now walk her sideways (↓), bow pointing the same way.', at: [186, 118], hdg: 0, hold: 5, wind: [-1.6, -2, 0.5] },
            { say: 'Last: swing the bow round to the new heading, and hold it in the gusts.', at: [186, 118], hdg: -28, hold: 6, wind: [2.4, 1.2, 0.7, 0.12] },
          ],
        },
      },
    },
  },
  {
    id: 'escapade', kind: 'minigame', mechanic: 'cruise', status: 'flown',
    title: 'ESCAPADE', date: '2025-11-13', place: 'Earth → Sun–Earth L2 → Mars', map: { x: 736, y: 48 },
    intro: 'Two small spacecraft, Blue and Gold, designed and built by Rocket Lab for NASA and the University of California, Berkeley, to study how the solar wind strips away the atmosphere of Mars. Berkeley leads and operates the mission. Having missed the 2024 Mars window, they leave Earth on 13 November 2025 on Blue Origin’s New Glenn and take a road nobody has used before: out to a looping “kidney bean” orbit around the Sun–Earth L2 point, about a million miles away, to wait; then back past Earth a year later, for a powered flyby that throws them at Mars.',
    how: 'In the game you fly Blue; Gold follows the same path a little behind. ←↑↓→ fire thrusters. There is no drag out here: every push stays until you cancel it with a push the other way, so use small ones and coast. Fly through the four gates around L2 in order. Then fall back to Earth and pass UNDER it through the green band: close, but not into the atmosphere. Hold Space at the lowest point to fire the main engine along your direction of travel: a burn deep in Earth’s gravity well buys far more energy than the same burn anywhere else. Leave through the Mars gate at top left with enough speed. Three stars for arriving with 35% of your propellant.',
    fact: 'NASA calls this the first time it has used a powered Earth flyby to send a spacecraft to Mars. The launch was held up twice in its last week, first by weather and then by a geomagnetic storm: a space-weather mission delayed by space weather. On the day, New Glenn’s booster, named “Never Tell Me The Odds”, made that rocket’s first landing.',
    after: 'Blue made its powered flyby on 7 November 2026 (US Eastern time), about 1,000 miles above Earth, and Gold followed on 9 November, about 650 miles up. Each fired its engine for roughly nine or ten minutes; Rocket Lab says the burns ran autonomously. Both spacecraft are now cruising to Mars. Gold, which left second, is due to arrive first, on 7 September 2027, and Blue two days later, with science from 2028. The story is still being written: this level gets its ending when they arrive.',
    egg: 'The burn at the bottom has a name, the Oberth effect: the faster a spacecraft is already going, the more energy the same push gives it. That is why the departure burn was made at the lowest point of an Earth flyby.',
    sources: ['https://science.nasa.gov/mission/escapade/', 'https://science.nasa.gov/science-research/heliophysics/nasas-escapade-completes-powered-earth-flybys-now-en-route-to-mars/', RL + 'updates/the-burns-that-sent-rocket-lab-built-spacecraft-to-mars-and-nbsp/', 'https://escapade.ssl.berkeley.edu/timeline/escapade-launch', 'https://news.berkeley.edu/2026/11/09/berkeleys-escapade-spacecraft-say-goodbye-to-earth-next-stop-mars/', 'https://spaceflightnow.com/2025/11/13/blue-origin-launches-twin-mars-probes-for-nasa-as-new-glenn-makes-first-landing/'],
  },
  {
    id: 'seven-diaries', kind: 'minigame', mechanic: 'slot-finder', status: 'flown', hero: 'iglesias', role: 'Space Lab · arranging the interview',
    title: 'Seven diaries, one slot', date: '2026-05-07', place: 'YouTube · five channels', map: { x: 536, y: 290 },
    intro: 'On 7 May 2026 Rocket Lab reports its first-quarter results and holds its call for investors at 2 p.m. Pacific. The next day five YouTube creators who follow the company post the same interview with Sir Peter Beck and the chief financial officer, Adam Spice: the four from the Q2 2024 interview (Vince of Vince is Bullish, Dave G, Matt Farley of MattMoney and Scott O) and, with them, Mrs. Iglesias of the Space Lab channel. On the day of the release Vince thanked her on X “for arranging the interview”, and Scott O for recording and editing it. This level is hers: seven diaries, two days, and one hour that suits everyone.',
    how: 'You play Mrs. Iglesias. The grid runs from Thursday afternoon to Friday afternoon, Pacific time, one row per person, and at the start only your own diary is known. ← → slide the meeting, ↑ ↓ make it longer or shorter, Space sends the invitation. Every reply shows a little more: a decline shows the block in the way, a yes shows a clear stretch in green. Enter opens the group chat: ask one person for their whole diary (two asks). An invitation needs an hour’s notice and the clock keeps running (the white line is now), so slots slip into the past while you think. After the meeting Scott O needs five hours to edit it (the bar under the grid), and that has to be done by the 3 p.m. release on Friday. Watch the striped TENTATIVE entry: later in the day it turns into a real meeting. Three stars for a meeting of an hour or more, edited in time, in three invitations or fewer. Stuck? I or the 💡 button gives a hint, for half an hour of clock. Every busy block is a game value: nobody’s real diary is known, and neither is when the interview was really recorded. In the game you send the invitations; the sources say only that she arranged it.',
    fact: 'Vince’s post on X, at 2:42 p.m. Pacific on 8 May, said the interview would go out on all five channels at the same time, 6 p.m. Eastern, “in 20 min”. YouTube dates Vince’s, Scott O’s and Dave G’s cuts to within a minute of 3 p.m. Pacific, Matt’s to 3:48 and Space Lab’s to 4:19.',
    after: 'Five cuts of the interview went up on Friday 8 May 2026, Pacific time (around midnight in central Europe, and Saturday morning in New Zealand): Vince is Bullish at 2:59 p.m., Scott O and Dave G Investing at 3:00, MattMoney at 3:48 and Space Lab at 4:19, each just under an hour long. Vince’s and Dave G’s descriptions link the other four channels; Scott O’s links her X account beside the other three creators’. (When the interview was really recorded is not published. The diaries, the edit time, the notice, the tentative meeting and the group chat are the game’s own, and in the game she sends the invitations; the sources say only that she arranged it.)',
    egg: 'Seven yeses the hard way: three stars without the group chat or a hint. And from the results release the interview followed, dated 7 May 2026: Rocket Lab had signed an agreement to acquire Motiv Space Systems, a maker of space robotics and precision mechanisms for spacecraft, and had introduced Gauss, an electric thruster for satellites designed for high-volume production. Both have chapters in her video.',
    diagram: { key: 'cast_q1_2026', caption: 'Drawn for the game; no photos are used. The five creators who posted the interview, and their two guests. Vince credited Mrs. Iglesias with arranging the interview and Scott O with recording and editing it. Meet her beside this node; the other four are beside “Four channels, one call”.' },
    watch: { url: 'https://www.youtube.com/watch?v=koo3ah18Idk', label: '“2026 Q1 Exclusive Retail Q&amp;A with Rocket Lab\'s CEO Sir Peter Beck and CFO Adam Spice”, on Mrs. Iglesias’s channel Space Lab (YouTube). The other four cuts are in the sources.' },
    sources: ['https://investors.rocketlabcorp.com/events/event-details/first-quarter-2026-financial-results-update-and-conference-call', 'https://www.sec.gov/Archives/edgar/data/1819994/000181999426000027/rklb-05072026ex991.htm', 'https://x.com/vinceisbullish/status/2052866834748063753', 'https://www.youtube.com/watch?v=koo3ah18Idk', 'https://www.youtube.com/watch?v=Y_f651VUDeE', 'https://www.youtube.com/watch?v=g_sYNlRrs8Q', 'https://www.youtube.com/watch?v=1gp76KjXkjc', 'https://www.youtube.com/watch?v=JGTKjh2GR4c'],
    params: {
      theme: 'q1-2026', clock: { date: '2026-05-07', start: 15, rate: 8, zone: 'PT' }, // hours after midnight on 7 May, Pacific; rate = real seconds per clock hour
      grid: [14, 40.5], step: 0.25, lengths: [0.75, 1, 1.25, 1.5], need: 1, startAt: 18, notice: 1, chats: 2, par: 3,
      tail: { hours: 5, label: 'SCOTT O EDITS IT', doing: 'Scott O is editing it' }, release: 39, // 3 p.m. Pacific on 8 May: the release Vince announced for 6 p.m. Eastern
      cues: [[38 + 42 / 60, '14:42 · Vince posts on X: the interview goes out on all five channels at 6 p.m. Eastern, “in 20 min”.']], // his real post, 21:42 UTC
      marks: [[14, ''], [39, ''], [40 + 19 / 60, 'RELEASES: FIRST CUTS 3 PM · SPACE LAB 4:19', 'top']], // green lines at the real times
      // Every busy block here is a game value, drawn so that only a few slots work. Only the call is real (its length is not: the game gives it an hour).
      rows: [
        { name: 'Mrs. Iglesias', chip: 'ci', lead: true, known: true, busy: [[15, 15.5], [23, 29], [34.5, 35], [37.5, 38.5]] },
        { name: 'Sir Peter Beck', chip: '', busy: [[14, 15, 'RESULTS CALL'], [15, 17.5], [21, 23.5], [32.25, 34], [37, 39]] },
        { name: 'Adam Spice', chip: 'a', busy: [[14, 15, 'RESULTS CALL'], [15.5, 17], [18.25, 19.25], [20.75, 22], [24, 31.25], [33, 35], [36.25, 37.5]] },
        { name: 'Vince', chip: 'cv', busy: [[14, 16], [18.25, 19.5], [22, 30.5], [32.25, 33], [38, 40.5]] },
        { name: 'Dave G', chip: 'cd', busy: [[14.5, 16], [20.75, 23], [25, 29.5], [33.5, 35], [39, 40.5]] },
        { name: 'Matt Farley', chip: 'cm', busy: [[17, 17.5], [18.75, 19.5], [23, 27], [29.5, 31.25], [32.25, 33.25], [36.25, 37]] },
        { name: 'Scott O', chip: 'cs', busy: [[16.5, 17.5], [21.5, 26], [28, 31.25], [34, 35], [36.25, 38]] },
      ],
      clashes: [{ row: 2, from: 20, to: 21.5, at: 17.5, label: 'TENTATIVE' }], // a game element: a late meeting that firms up at 5:30 p.m. on Thursday
    },
  },
  {
    id: 'q1-2026-qa', kind: 'card', status: 'flown',
    title: 'Five channels, one Q&A', date: '2026-05-08', place: 'YouTube · five channels', map: { x: 506, y: 314 },
    intro: 'On Friday 8 May 2026, Pacific time, the day after Rocket Lab’s first-quarter results, one interview with Sir Peter Beck and Adam Spice goes up on five YouTube channels in under an hour and a half. Mrs. Iglesias’s cut on Space Lab, the last of the five at 4:19 p.m. (1:19 a.m. on Saturday 9 May in central Europe, 11:19 a.m. on Saturday in New Zealand), describes it as an exclusive Q&amp;A for the retail community. The chapter list YouTube shows on it runs from the quarter’s performance, Electron and launch strategy and space systems, through the Motiv Space acquisition, solar power, propulsion, Neutron and human flight, to company culture, Europe and debt.',
    fact: 'It is the earliest of the group’s joint interviews with Beck and Spice that includes her, as far as their own videos show: under his Q3 2024 and Q1 2025 interviews Scott O links the X accounts of the original four only, under Q1 2026 he adds hers, and her channel has no earlier one. Her channel also has the group’s interviews after the Q2 and Q3 2026 results.',
    after: '',
    watch: { url: 'https://www.youtube.com/watch?v=koo3ah18Idk', label: '“2026 Q1 Exclusive Retail Q&amp;A with Rocket Lab\'s CEO Sir Peter Beck and CFO Adam Spice”, on Space Lab (YouTube).' },
    diagram: { key: 'cast_q1_2026', caption: 'Drawn for the game; no photos are used. The five creators and their two guests.' },
    sources: ['https://www.youtube.com/watch?v=koo3ah18Idk', 'https://www.youtube.com/watch?v=Y_f651VUDeE', 'https://www.youtube.com/watch?v=g_sYNlRrs8Q', 'https://www.youtube.com/watch?v=1gp76KjXkjc', 'https://www.youtube.com/watch?v=JGTKjh2GR4c', 'https://www.youtube.com/watch?v=-Og4I_aP4DU', 'https://www.youtube.com/watch?v=9nLS-gN3l8o', 'https://www.youtube.com/@spacelabRKLB/videos', 'https://www.youtube.com/watch?v=AHQLGGvcHUQ', 'https://www.youtube.com/watch?v=D2QDxLmaYoI'],
  },
  {
    id: 'victus-haze', kind: 'minigame', mechanic: 'countdown-race', status: 'flown',
    title: 'VICTUS HAZE', date: '2026-06-19', place: 'LC-1, Māhia', map: { x: 222, y: 304 },
    intro: 'A test set by the US Space Force: can a company keep a rocket and a spacecraft on standby, and then, when the order comes, launch into an orbit it was only told about in that order, inside 24 hours? Rocket Lab has built its spacecraft, a Pioneer, as well as the rocket; a second company, True Anomaly, already has its own spacecraft, Jackal, in orbit for the two to meet. The record for this kind of mission, set by Firefly and Millennium on VICTUS NOX in 2023, stands at 27 hours. In June 2026, at Māhia, the notice arrives before dawn. The clock is running.',
    how: 'Ten jobs stand between the notice and lift-off, and you have two crews. ↑ ↓ choose a job, Space gives it to a free crew. Some jobs cannot start until others are finished: the list says what each one waits for. Nothing can be loaded until Electron is on the pad and vertical; the range cannot be cleared until the trajectory exists. An idle crew is lost time, and so is a crew on a job that nothing is waiting for. Launch inside 24 hours to pass; three stars for beating the real time, 16 hours 42 minutes. (The ten jobs and how long each takes are the game’s own.)',
    fact: 'Rocket Lab’s own figures: 16 hours 42 minutes from receiving the Notice to Launch to lift-off, of which about four hours went on finalising trajectories, updating the flight software and co-ordinating ground stations for the orbit it had just been given. That beat the earlier record, set on VICTUS NOX in 2023, by more than ten hours.',
    after: 'Electron lifted off from Launch Complex 1 at 10:19 pm New Zealand time on 19 June 2026 carrying Rocket Lab’s Pioneer spacecraft. Rocket Lab says Pioneer was checked out and ready in 37 hours 36 minutes against a 72-hour deadline, then pursued, approached and photographed its target in orbit; it declared its mission a success on 7 July. True Anomaly’s Jackal, launched in May on a Falcon 9 rideshare, flew the other half of the exercise.',
    egg: 'More than an hour inside the real time. The second half of the test happened in orbit: Rocket Lab says Pioneer completed its rendezvous and proximity operations in under 59 hours, against a deadline of 84.',
    sources: ['https://investors.rocketlabcorp.com/news-releases/news-release-details/rocket-lab-shatters-responsive-space-record-launches-us-space', RL + 'missions/launches/victus-haze/', 'https://www.ssc.spaceforce.mil/Newsroom/Article/4523601/space-force-sets-new-record-with-victus-haze-launch', 'https://www.airandspaceforces.com/space-force-mission-goes-from-orders-to-launch-in-less-than-17-hours/', 'https://www.space.com/space-exploration/launches-spacecraft/1-private-spacecraft-intercepts-another-on-space-forces-groundbreaking-victus-haze-mission', RL + 'updates/rocket-lab-delivers-mission-success-for-space-force-completes-historic-launch-and-on-orbit-satellite-tracking-mission-in-record-time/', RL + 'updates/rocket-lab-selected-by-space-systems-command-to-build-and-launch-spacecraft-for-tactically-responsive-space-tacrs-mission/'],
  },
  {
    id: 'the-mountain-god-rises', kind: 'launch', mechanic: 'launch', status: 'flown',
    title: 'The Mountain God Rises', date: '2026-11-14', place: 'LC-1, Māhia', map: { x: 248, y: 294 },
    intro: 'Launch number one hundred. A Japanese radar satellite for iQPS sits under the fairing, another in the long “God” series of mission names. Nine years after “It’s a Test”, fly the hundredth Electron like it is routine.',
    how: 'The full procedure, in the early evening light. Call the count (Enter holds), ← → on the cue, ↑ ↓ throttle through Max-Q, Space for each sequence event, Enter for SECO at 575 km apogee, then hold Space to circularise with Curie at apogee and Enter to deploy.',
    fact: 'The iQPS missions are all named for gods: The Moon God Awakens, The Lightning God Reigns, The Sea God Sees, The Mountain God Guards… and the Owl missions for Synspective’s StriX satellites are a whole genre of puns.',
    after: 'On 14 November 2026 Electron became the fastest commercial rocket to reach 100 launches. With ten Rutherfords per vehicle, that is about a thousand engines flown.',
    egg: 'Three stars on flight 100. Onwards to Neutron.',
    sources: ['https://finviz.com/news/422837/rocket-lab-hits-100-electron-launches-fastest-commercial-rocket-to-reach-the-milestone', WP + 'List_of_Electron_launches'],
    params: { vehicle: 'electron', site: 'mahia', goal: { orbit: true, orbit_km: 575 }, twist: 'kick-stage', payload: 'QPS-SAR-19', hundred: true },
  },
  {
    id: 'archimedes', kind: 'platform', mechanic: 'platform', status: 'in-progress', role: 'Founder and CEO · 2026', unlocks: 'hungry-hippo',
    title: 'Archimedes and the tank', date: '2024–2026', place: 'Stennis → Middle River → Wallops', map: { x: 728, y: 308 },
    intro: 'Neutron is not one project but several, spread from the Gulf Coast to the Atlantic. The engine, Archimedes, burns methane and liquid oxygen and is fired on a stand at NASA’s Stennis Space Center in Mississippi. The carbon structures are laid up in Middle River, Maryland, by a ninety-tonne machine. The pad, Launch Complex 3, is on Wallops Island in Virginia. Between 2024 and 2026 all three have to come good, and one of them does not go to plan: in January 2026 a first-stage tank ruptures in a pressure test, and in October voids turn up in a tank dome. Carry what Neutron needs from one end of the story to the other.',
    how: 'Arrows to run, Space to jump. Collect the five things and reach Launch Complex 3. New here: the test positions. An engine over the trench fires on a cycle: green lamp, then flashing amber, then a second of blue flame. Cross while it is quiet. Wait out the ice falling from the cryogenic lines, jump on the blue crabs, and keep your head out of the drifting voids. Power-ups float in bubbles: the cryo kit (face shield, apron, gauntlets) makes you untouchable, and the methane-and-oxygen pack lets you fly on a blue flame (hold Space). A hidden blueprint unlocks a secret on the map.',
    fact: 'Archimedes is an oxidiser-rich staged-combustion engine making 733 kN (165,000 lbf). Rocket Lab announced its first hot fire at Stennis in August 2024 and said the engine reached 102% power. Nine of them will lift Neutron’s first stage.',
    after: 'The story so far. Launch Complex 3 opened on 28 August 2025. On 21 January 2026 Rocket Lab said a Stage 1 tank had ruptured overnight in a hydrostatic pressure trial during qualification testing, with “no significant damage to the test structure or facilities”, and that the next tank was already in production. In October 2026 it reported that a manufacturing process issue had left voids in parts of a composite propellant tank dome; the process has been refined and a replacement forward dome is being made. Still to come: finish and inspect that dome, assemble the tank, and put it through hydrostatic and cryogenic tests. First flight is no earlier than 2027, and this level will grow with it.',
    egg: 'Eureka! Rocket Lab names its engines after scientists: Rutherford, Curie, and for Neutron, Archimedes, the Greek who is said to have shouted “Eureka!” in his bath when he saw how to measure a volume by the water it pushes aside.',
    sources: [RL + 'updates/rocket-lab-completes-successful-first-hot-fire-of-archimedes-engine-for-neutron-rocket/', 'https://www.nasa.gov/centers/stennis/news/releases/2022/NASA-Stennis-Space-Center-Rocket-Lab-Cut-Ribbon-on-New-Tenant-Agreement', RL + 'updates/rocket-lab-begins-installation-of-large-carbon-composite-rocket-building-machine/', RL + 'updates/rocket-lab-neutron-test-update/', 'https://www.sec.gov/Archives/edgar/data/1819994/000181999426000074/rklb-20260930.htm', RL + 'updates/rocket-lab-opens-launch-complex-3-a-critical-milestone-on-the-path-to-neutrons-first-launch/', 'https://www.nasa.gov/stennis/engineering-and-test-directorate/test-support-infrastructure'],
    params: {
      theme: 'stennis', width: 84,
      ground: [[0, 16, 9], [19, 34, 9], [37, 54, 9], [57, 83, 9]],
      plats: [[4, 7, 3], [20, 7, 3], [23, 5, 3], [29, 7, 3], [37, 7, 3], [63, 7, 3]],
      parts: [[5, 6, 'Archimedes engine'], [30, 6, 'Hot-fire data: 102% power'], [38, 6, 'Carbon fibre for the big machine'], [52, 8, 'The fix for the dome process'], [64, 6, 'Keys to Launch Complex 3']],
      hazards: [], sheep: [], egg: [24, 4], goal: 80, fires: [9, 14],
      enemies: [['ice', 33, 33], ['crab', 46, 49], ['void', 58, 61], ['crab', 72, 77]],
      powerups: [['F', 7, 8], ['M', 58, 6]], secret: [56, 3],
      signs: [],
    },
  },
  {
    id: 'neutron', kind: 'launch', mechanic: 'launch', status: 'announced',
    title: 'Neutron: first flight', date: 'no earlier than 2027', place: 'LC-3, Wallops Island, Virginia', map: { x: 802, y: 270 },
    intro: 'The medium-lift rocket: 43 m tall, 13 tonnes to low Earth orbit, a carbon-composite first stage 7 m across on nine methane-fuelled Archimedes engines, and a “Hungry Hippo” fairing that stays attached, opens its jaws to let the second stage out, and flies home with the booster. The landing platform is a 122 m barge named Return On Investment. Neutron has not flown yet, and this game will not pretend otherwise.',
    fact: 'In October 2026 Rocket Lab reported that a manufacturing process issue had left voids in parts of a composite propellant tank dome for the first stage. It has refined the process and is making a replacement forward dome; the tank still has to be assembled and tested. First flight is now no earlier than 2027.',
    after: '',
    sources: [RL + 'launch/neutron/', 'https://www.sec.gov/Archives/edgar/data/1819994/000181999426000074/rklb-20260930.htm', 'https://www.sec.gov/Archives/edgar/data/1819994/000181999426000073/rklb-11092026ex991.htm', WP + 'Rocket_Lab_Neutron'],
  },
];

/** Secret nodes: off the main path, shown only once the blueprint hidden in a platform level has been found. */
export const BONUS: LevelDef[] = [
  {
    id: 'street-sprint', kind: 'minigame', mechanic: 'sprint', status: 'flown', parent: 'workshop',
    title: 'Princes Street Sprint', date: '2000', place: 'Princes Street, Dunedin', map: { x: 148, y: 376 },
    intro: 'The bike is finished: a bicycle frame with a hydrogen-peroxide rocket slung along it and no real brakes to speak of. There is a street sprint on Princes Street, a crowd behind the barriers, and a low red sports car on the start line that is supposed to be the fast one.',
    how: 'Hold Space to open the valve. The faster you go, the more the bike wobbles: tap Left and Right to keep the needle centred. Stay upright to the chequered flag. Three stars for 140 km/h.',
    fact: 'Peroxide rockets make steam, not fire: the propellant decomposes over a catalyst and leaves a white plume.',
    after: 'Around 2000, at a street sprint on Princes Street in Dunedin, Beck rode the rocket bike from a standstill to about 140 km/h in under five seconds, lying along the frame in a jumpsuit and helmet. By some accounts it out-ran a Dodge Viper that day.',
    role: 'Apprentice toolmaker · 2000',
    sources: [WP + 'Peter_Beck', 'https://www.odt.co.nz/news/dunedin/fisher-and-paykel-fuelled-flames-novice-rocket-maker'],
  },
  {
    id: 'kaitorete', kind: 'card', status: 'flown', parent: 'lc-1',
    title: 'Kaitorete Spit: the first choice', date: '2015', place: 'Canterbury', map: { x: 172, y: 352 },
    intro: 'In mid-2015 Rocket Lab names its launch site: Kaitorete Spit, a long shingle barrier between Lake Ellesmere / Te Waihora and the sea, south of Christchurch. Consents take longer than hoped, and the site would only allow about a launch a month. In November 2015 the company says its main pad will instead be on the Māhia Peninsula, licensed for a launch every 72 hours.',
    fact: 'The spit got its rockets in the end. In 2021 the Crown and local rūnanga bought land there for what became the Tāwhaki National Aerospace Centre, a test and launch site for other companies.',
    after: '',
    sources: [WP + 'Rocket_Lab_Launch_Complex_1', WP + 'Kaitorete_Spit'],
  },
  {
    id: 'photon', kind: 'card', status: 'flown', parent: 'factory',
    title: 'Photon: the kick stage grows up', date: '2019–2020', place: 'Auckland → low Earth orbit', map: { x: 100, y: 190 },
    intro: 'On 8 April 2019, in Colorado Springs, Rocket Lab unveils Photon: a satellite bus built out of Electron’s kick stage, so that a customer can bring only an instrument and buy the rocket and the spacecraft together. The first one flies in disguise. On 31 August 2020, about an hour after “I Can’t Believe It’s Not Optical” lifts off, the kick stage releases Capella’s Sequoia satellite and is then commanded into “Photon satellite mode”. The stage that delivered the customer simply stays up, and becomes Rocket Lab’s first satellite: “First Light”.',
    fact: 'Nobody outside the company knew until Rocket Lab revealed it on 3 September 2020. First Light’s job was to prove the power, thermal and attitude-control systems for long stays in orbit. Two years later a Lunar Photon sent CAPSTONE toward the Moon.',
    after: '',
    sources: ['https://spacenews.com/rocket-lab-unveils-photon-smallsat-bus/', RL + 'updates/media-release-rocket-lab-launches-first-in-house-designed-and-built-photon-satellite/', WP + 'Rocket_Lab_Photon'],
  },
  {
    id: 'hungry-hippo', kind: 'card', status: 'flown', parent: 'archimedes',
    title: 'The Hungry Hippo arrives', date: '2026-01', place: 'Wallops Island, Virginia', map: { x: 846, y: 286 },
    intro: 'Most rockets throw their fairings away. Neutron keeps its own: the two halves stay attached to the first stage, open like a pair of jaws to let the second stage and its payload out, then close again for the ride back to Earth. Rocket Lab calls it the Hungry Hippo. On 23 January 2026 the fairing arrived at Wallops Island by barge; Neutron is assembled there, a few miles from its pad.',
    fact: 'Neutron’s first stage is meant to land at sea on a platform 122 m (400 ft) long. Its name is Return On Investment.',
    after: '',
    sources: [RL + 'updates/hungry-hippo-arrives/', 'https://www.vaspace.org/news-article/hungry-hippo-arrives-at-wallops-major-milestone-to-first-neutron-launch', RL + 'launch/neutron/'],
  },
  {
    id: 'five-for-five', kind: 'card', status: 'flown', parent: 'no-time-toulouse',
    title: 'Kinéis: five for five', date: '2024–2025', place: 'Launch Complex 1 → 635 km', map: { x: 212, y: 210 },
    intro: '“No Time Toulouse” was the first of five dedicated Electron launches for Kinéis, each carrying five satellites. The other four, all from Launch Complex 1, were “Kinéis Killed the RadIOT Star” (September 2024), “Ice AIS Baby” (25 November 2024, New Zealand time: the second count of the Two Hemispheres level), “IOT 4 You and Me” (February 2025) and “High Five” (18 March 2025, 01:31 UTC). With the last of them Rocket Lab had put Kinéis’s whole constellation of 25 satellites in orbit, in less than a year.',
    fact: 'Rocket Lab says launching the satellites on dedicated flights gave Kinéis more say over the launch schedule, the orbit and the deployment than a larger rideshare would have. Kinéis said it would start its commercial service on 1 June 2025.',
    after: '',
    sources: [RL + 'missions/launches/high-five/', RL + 'missions/launches/kineis-killed-the-radiot-star/', RL + 'missions/launches/ice-ais-baby/', RL + 'missions/launches/iot-4-you-and-me/', 'https://satnews.com/2025/03/17/successful-rocket-lab-launch-completes-deployment-of-full-kineis-constellation-in-less-than-a-year/'],
  },
  {
    id: 'first-hundred', kind: 'card', status: 'flown', parent: 'find-the-launch-site',
    title: 'Inside the first hundred', date: '2017–2026', place: 'Māhia and Auckland', map: { x: 250, y: 206 },
    intro: 'Some of the people Rocket Lab’s own account of its first hundred launches puts in the room. Sandy Tirtey was Electron’s first launch director and directed its first seven launches. Jane McNicoll, in mission management since 2019, worked on roughly ninety of the hundred. Max Prescott joined vehicle integration in January 2018, in time for the first flight to reach orbit. And Murielle Baker, a former Radio New Zealand journalist, is the voice many fans know from the launch webcasts.',
    fact: 'The same account says that after the thirteenth flight was lost in 2020, Sir Peter Beck recorded a personal video apology to customers.',
    after: '',
    sources: [RL + 'updates/trust-me-its-gonna-take-off-inside-electrons-first-100-launches/'],
  },
];
/**
 * The cast. Peter Beck is the main character of the whole game. Other people take the lead for a level that is theirs
 * (`hero` on the level), or join as a power-up (`buddy` in a platform level). `pre` is the texture prefix of the sprite set (see art.ts).
 */
export interface Character {
  id: string; pre: string; name: string; role: string; since: number; likeness: string;
  /**
   * A running mate who does something other than clear the way (Platform.ts): 'reporter' walks with you, marks hidden things and
   * takes photos; 'host' walks with you, opens access doors, and films: whatever is in front of her camera gets out of the shot.
   */
  trait?: 'reporter' | 'host';
  /** For a running mate: who they are and why they are in this level, shown on the level's intro card. */
  note?: string;
}
export const CHARACTERS: Character[] = [
  { id: 'peter', pre: '', name: 'Peter Beck', role: 'Founder and CEO', since: 1995, likeness: 'A tall mop of tight dark curls, a broad face, black top and jeans.' },
  { id: 'adam', pre: 'a', name: 'Adam Spice', role: 'Chief Financial Officer', since: 2018, likeness: 'Shaved head, long face with a heavy jaw, pale brows, navy blazer over an open-collar shirt.' },
  { id: 'vance', pre: 'v', name: 'Ashlee Vance', role: 'Journalist · reporting a book', since: 2015, trait: 'reporter', likeness: 'Short dark-brown hair, close at the sides with the ears showing, the top brushed up; a broad, full face with a wide jaw; light blue eyes; a navy flannel shirt checked with teal and mustard, open over a black tee. Here he carries a reporter’s notebook and a camera.', note: 'A Bloomberg Businessweek journalist and the author of a biography of Elon Musk. In November 2018 he spent a day at Rocket Lab’s main factory in Auckland with Peter Beck, while reporting his book <i>When the Heavens Went on Sale</i>; he had first visited Beck in Auckland in 2015. This level is set a year after that day, so his walk round the floor here is the game’s own.' },
  { id: 'madison', pre: 'm', name: 'Madison Malone', role: 'NZ Herald · host of Markets with Madison', since: 2023, trait: 'host', likeness: 'Long, straight brown hair parted in the centre and worn loose past the shoulders, darker at the crown and lighter in the lengths; a round, full face with a soft chin; hazel eyes under defined dark brows; a broad smile that shows her teeth; a black crew-neck tee. Here, on a winter morning, she has a black jacket over it and carries a small handheld camera with a light on it.', note: 'In 2024 a senior business journalist at the NZ Herald and the host of its investment show <i>Markets with Madison</i> (she was bylined Madison Reidy when it began, in February 2023). Rocket Lab gave the show exclusive access to its mission control in Auckland for this launch, and her report from inside the room was published on 23 June 2024. She appears with her agreement. Her walk in from the street, her jacket and the camera she carries are the game’s own; the game gives her no words.' },
  { id: 'iglesias', pre: 'ci', name: 'Mrs. Iglesias', role: 'creator of the YouTube channel Space Lab', since: 2026, likeness: 'A big mane of loose, springy curls past the shoulders, dark at the roots and auburn to golden in the lengths; dark sunglasses; a wide smile that shows her teeth; a black tee.' },
  { id: 'shaun', pre: 's', name: 'Shaun D’Mello', role: 'an engineer at Rocket Lab since 2014, today Vice President, Neutron', since: 2014, likeness: 'Short dark hair, close at the sides and brushed up on top; clean-shaven; a rounded face with dark brows; blazer over an open-neck white shirt.' },
];

/** People you can meet: small nodes off the main path. Facts only, no invented quotes. */
export const PEOPLE: LevelDef[] = [
  {
    id: 'first-backers', kind: 'person', status: 'flown', parent: 'founded',
    title: 'Mark Rocket and Sir Stephen Tindall', date: '2006–2007', place: 'Auckland', map: { x: 160, y: 198 },
    intro: 'Mark Rocket is an internet entrepreneur who changed his surname from Stevens to Rocket in 2000 and set himself the goal of being the first New Zealander in space. He becomes a seed investor in Rocket Lab and its co-director from 2007 to 2011. Sir Stephen Tindall, founder of The Warehouse, met Beck at Industrial Research Ltd and is another early backer. <br><img class="inline" src="assets/photos/stephen_tindall.jpg" alt="Sir Stephen Tindall"> <span class="src">Sir Stephen Tindall. Photo: New Zealand Government, Office of the Governor-General, CC BY 4.0.</span>',
    fact: 'Mark Rocket got there. On 1 June 2025 he flew on Blue Origin’s New Shepard NS-32 and became the first New Zealander to reach space. He now runs Kea Aerospace in Christchurch.',
    after: '',
    photo: { file: 'mark_rocket.jpg', caption: 'Mark Rocket.', credit: 'RocketNZ, CC BY-SA 4.0', page: C + 'Mark_Rocket_sm.jpg' },
    sources: [WP + 'Mark_Rocket', WP + 'Stephen_Tindall', WP + 'Rocket_Lab'],
  },
  {
    id: 'ky-michaelson', kind: 'person', status: 'flown', parent: 'founded',
    title: 'Ky “Rocketman” Michaelson', date: '2006', place: 'Minnesota, USA', map: { x: 710, y: 216 },
    intro: 'On his 2006 trip to the United States, Beck goes to Minnesota to meet Ky Michaelson, a rocketeer he had written to beforehand, known to everyone as Rocketman. It is the first stop on a self-guided “rocket pilgrimage” that takes in NASA and the big aerospace contractors.',
    fact: 'Beck came home from that trip convinced that nobody was building the small, cheap launcher he had in mind, and started Rocket Lab the same year.',
    after: '',
    sources: [WP + 'Peter_Beck'],
  },
  {
    id: 'michael-fay', kind: 'person', status: 'flown', parent: 'atea-1',
    title: 'Sir Michael Fay', date: '2009', place: 'Great Mercury Island', map: { x: 228, y: 176 },
    intro: 'A merchant banker, a partner in Fay Richwhite, and the co-owner of Great Mercury Island off the Coromandel. Ātea-1 was launched from the island in November 2009.',
    fact: 'Wikipedia’s Rocket Lab article describes him as a Rocket Lab investor as well as the launch-site host.',
    after: '',
    photo: { file: 'michael_fay.jpg', caption: 'Sir Michael Fay.', credit: 'Robert John Tucker, CC BY 4.0', page: C + 'Michael_Fay_(cropped).jpg' },
    sources: [WP + 'Michael_Fay_(banker)', WP + 'Rocket_Lab'],
  },
  {
    id: 'dava-newman', kind: 'person', status: 'flown', parent: 'rutherford',
    title: 'Dava Newman', date: '2016-07', place: 'Auckland', map: { x: 134, y: 244 },
    intro: 'An aerospace engineer and MIT professor, and in 2016 the Deputy Administrator of NASA. On a visit to New Zealand that July she tours Rocket Lab in Auckland, a few months before Electron completes flight qualification.',
    fact: 'NASA had signed a partnership with Rocket Lab in 2015, and in 2018 Electron flew its first NASA mission, “This One’s For Pickering”.',
    after: '',
    photo: { file: 'beck_newman_2016.jpg', caption: 'Dava Newman with Peter Beck at Rocket Lab, July 2016.', credit: 'US Embassy New Zealand, CC BY 2.0', page: C + 'Dr_Dava_Newman,_NASA_Deputy_Administrator_visit_to_New_Zealand,_July_11-18,_2016_(27619573814).jpg' },
    sources: [WP + 'Dava_Newman', WP + 'Rocket_Lab'],
  },
  {
    id: 'gabe-newell', kind: 'person', status: 'flown', parent: 'return-to-sender',
    title: 'Gabe Newell', date: '2020-11', place: 'Aotearoa New Zealand', map: { x: 328, y: 338 },
    intro: 'A co-founder of Valve, the games company behind Half-Life and Steam. In November 2020 he puts an unusual passenger on “Return To Sender”: Gnome Chompski, a garden gnome from Valve’s games, remade with Wētā Workshop as a 150 mm figure in 3D-printed titanium. It flies as a mass simulator bolted to the kick stage, and burns up with it at the end of the mission. In Half-Life 2: Episode Two, carrying the gnome all the way to a rocket earns the achievement “Little Rocket Man”. This time it happened for real.',
    fact: 'He pledged one dollar to the paediatric intensive care unit at Starship Children’s Hospital for every person who watched the launch webcast. PC Gamer reported the total as NZ$286,092.',
    after: '',
    sources: [RL + 'updates/rocket-lab-launches-16th-mission-completes-booster-recovery/', 'https://www.pcgamer.com/gnome-chompski-is-now-one-with-the-cosmos-and-gabe-newell-donated-dollar200k-to-a-childrens-hospital/'],
  },
  {
    id: 'rob-lillis', kind: 'person', status: 'flown', parent: 'escapade',
    title: 'Rob Lillis', date: '2025', place: 'UC Berkeley Space Sciences Laboratory', map: { x: 708, y: 66 },
    intro: 'Associate director for planetary science at the Space Sciences Laboratory of the University of California, Berkeley, and the principal investigator of ESCAPADE: the scientist who answers to NASA for the mission. Berkeley conceived, leads and operates it; Rocket Lab designed and built the two spacecraft. Blue and Gold are Berkeley’s colours.',
    fact: 'Each spacecraft weighs 209 kg dry and 535 kg fuelled. More than half of what left Earth was propellant for the journey.',
    after: '',
    sources: ['https://science.nasa.gov/mission/escapade/', 'https://escapade.ssl.berkeley.edu/news/', 'https://news.berkeley.edu/2026/11/09/berkeleys-escapade-spacecraft-say-goodbye-to-earth-next-stop-mars/'],
  },
  {
    id: 'madison-malone', kind: 'person', status: 'flown', parent: 'sir-peter', portrait: 'm',
    portraitCredit: 'Likeness from her byline photo on NZ Herald articles; no freely licensed photo is available.',
    title: 'Madison Malone', date: '2024-06', place: 'Rocket Lab mission control, Auckland', map: { x: 176, y: 238 },
    intro: 'In 2024, a senior business journalist at the NZ Herald and the host of its investment show <i>Markets with Madison</i>, which launched in February 2023; she was bylined Madison Reidy when it began. For Electron’s 50th launch, “No Time Toulouse”, early on Friday 21 June 2024 New Zealand time, Rocket Lab gave the show exclusive access to its mission control in Auckland. Her report from inside the room was published on 23 June.',
    fact: 'In May 2024 NZME announced that she was the only New Zealander in the media category of that year’s Forbes 30 Under 30 Asia list. Peter Beck had been on her show a year earlier: see the Markets with Madison card in America.',
    after: '',
    sources: ['https://www.nzherald.co.nz/hawkes-bay-today/news/behind-rocket-labs-50th-launch-realising-sir-peter-becks-dream/HXA325VFNVGKNOPYIN4ZNRIOHU', 'https://www.nzme.co.nz/news/nz-herald-s-madison-reidy-makes-2024-forbes-30-under-30-asia-list', WP + 'List_of_Electron_launches'],
  },
  // The four creators of the Q2 2024 interview: their public role as YouTube creators, from their own channels and videos.
  {
    id: 'vince-is-bullish', kind: 'person', status: 'flown', parent: 'four-channels', portrait: 'cv',
    portraitCredit: 'Drawn from his YouTube channel picture; no freely licensed photo is available.',
    title: 'Vince is Bullish', date: '2024-08', place: 'YouTube · @vinceisbullish', map: { x: 390, y: 228 },
    intro: 'A YouTube creator who goes by Vince, on the channel Vince is Bullish (@vinceisbullish on YouTube and X). He asked the first questions in the four-part interview with Sir Peter Beck and Adam Spice after the Q2 2024 results, and posted it as part 1. His description lists the Q2 earnings, Rocket Lab’s competition and Neutron’s propulsive landing among the subjects.',
    fact: 'It was not his first time talking to Beck: his channel has “A Conversation With Rocket Lab CEO Peter Beck About The Future”, posted on 8 May 2024, two days after the Q1 2024 results. Two years later, on 8 May 2026, he posted the group’s joint interview with Beck and Spice after the Q1 2026 results, with Mrs. Iglesias of Space Lab joining the four; his post on X that day thanked her for arranging it and Scott O for recording and editing it.',
    after: '',
    sources: ['https://www.youtube.com/watch?v=nYirK_3WRYA', 'https://www.youtube.com/watch?v=BKIOvo_jYC8', 'https://www.youtube.com/watch?v=T__1ubfs_iE', 'https://www.youtube.com/@vinceisbullish', 'https://www.youtube.com/watch?v=Y_f651VUDeE', 'https://x.com/vinceisbullish/status/2052866834748063753'],
  },
  {
    id: 'dave-g', kind: 'person', status: 'flown', parent: 'four-channels', portrait: 'cd',
    portraitCredit: 'Drawn from his YouTube channel picture; no freely licensed photo is available.',
    title: 'Dave G', date: '2024-08', place: 'YouTube · Dave G Investing', map: { x: 404, y: 266 },
    intro: 'The YouTube creator behind Dave G Investing (@daveginvesting). Part 2 of the Q2 2024 interview, “Talking Space &amp; Rocket Lab With Sir Peter Beck!”, went up on his channel. Two days later he posted the “Complete Interview”, noting that its four sections had first been posted on the individual channels.',
    fact: 'Three months earlier, on 8 May 2024, he had posted “The Future of Rocket Lab: Interview With CEO Peter Beck &amp; CFO Adam Spice!”, after the Q1 2024 results. His cut of the Q1 2026 interview, posted on 8 May 2026, lists the other participants: Space Lab, Scott O, MattMoney and Vince.',
    after: '',
    sources: ['https://www.youtube.com/watch?v=dfIHhLd9Wjs', 'https://www.youtube.com/watch?v=JEOcyOo77Po', 'https://www.youtube.com/watch?v=kldLGQHMU98', 'https://www.youtube.com/@daveginvesting', 'https://www.youtube.com/watch?v=1gp76KjXkjc'],
  },
  {
    id: 'matt-farley', kind: 'person', status: 'flown', parent: 'four-channels', portrait: 'cm',
    portraitCredit: 'Drawn from his YouTube channel picture; no freely licensed photo is available.',
    title: 'Matt Farley', date: '2024-08', place: 'YouTube · MattMoney', map: { x: 428, y: 262 },
    intro: 'A YouTube creator whose channel is MattMoney (@RealMattMoney); on it he describes himself as an engineer. He also writes about Rocket Lab on Seeking Alpha under his own name. Part 3 of the Q2 2024 interview went up on his channel, and its description sets out the order to watch in: Vince’s channel first, then Dave G, then his, then Scott.',
    fact: 'His full cut, posted on 13 August, is called “The ENTIRE Sir Peter Beck and Adam Spice Interview”. The same four, with Mrs. Iglesias of Space Lab, interviewed Beck and Spice again after the Q1 2026 results, and his cut went up on 8 May 2026.',
    after: '',
    sources: ['https://www.youtube.com/watch?v=WAoYVU3pnXY', 'https://www.youtube.com/watch?v=LpUnlXgn4dw', 'https://www.youtube.com/@RealMattMoney/about', 'https://seekingalpha.com/article/4664134-rocket-lab-the-future-is-bright', 'https://www.youtube.com/watch?v=JGTKjh2GR4c'],
  },
  {
    id: 'scott-o', kind: 'person', status: 'flown', parent: 'four-channels', portrait: 'cs',
    portraitCredit: 'Drawn from a frame of the full interview on his channel; his channel picture is a graphic, and no freely licensed photo is available.',
    title: 'Scott O', date: '2024-08', place: 'YouTube · @scotto2050', map: { x: 436, y: 240 },
    intro: 'A YouTube creator on the channel Scott O (@scotto2050). He asked the last questions of the Q2 2024 interview and posted them as part 4, “Post-Q2 Q&amp;A with Sir Peter Beck &amp; Adam Spice of Rocket Lab”, whose chapters run from new launch timeframes and merchant components to Neutron spending and Electron capacity and recovery plans.',
    fact: 'His full cut is the one whose title names the quarter, “FULL INTERVIEW | Sir Peter Beck &amp; Adam Spice of Rocket Lab (Q2 2024)”, and its chapters mark where each creator’s turn begins. After the Q1 2026 results it was Scott O who recorded and edited the group’s interview, as Vince said on X when it went out on 8 May 2026.',
    after: '',
    sources: ['https://www.youtube.com/watch?v=fzIBsEy4BU8', 'https://www.youtube.com/watch?v=QIIcZ0MK0_A', 'https://www.youtube.com/@scotto2050', 'https://www.youtube.com/watch?v=g_sYNlRrs8Q', 'https://x.com/vinceisbullish/status/2052866834748063753'],
  },
  // Mrs. Iglesias, who arranged the Q1 2026 interview: her public role as a YouTube creator, from her own channel and X account.
  {
    id: 'mrs-iglesias', kind: 'person', status: 'flown', parent: 'seven-diaries', portrait: 'ci',
    portraitCredit: 'Drawn from her X profile picture; her channel picture is the Space Lab logo, and no freely licensed photo is available.',
    title: 'Mrs. Iglesias', date: '2026-05', place: 'YouTube · Space Lab', map: { x: 564, y: 312 },
    intro: 'The creator of the YouTube channel Space Lab (@spacelabRKLB), which describes itself as a small creator dedicated to Rocket Lab; on X she is @MrsIglesiasRKLB. After Rocket Lab’s Q1 2026 results she joined Vince, Dave G, Matt Farley and Scott O for their interview with Sir Peter Beck and Adam Spice, and on the day it went out Vince thanked her on X for arranging it. Her cut is the Watch link on the level next door.',
    fact: 'Her channel also has an unboxing of an Electron model, posted in November 2025: that is why one stands boxed on the shelf in her level.',
    after: '',
    sources: ['https://www.youtube.com/@spacelabRKLB', 'https://x.com/MrsIglesiasRKLB', 'https://x.com/vinceisbullish/status/2052866834748063753', 'https://www.youtube.com/watch?v=koo3ah18Idk', 'https://www.youtube.com/watch?v=GN9yQDkoetM'],
  },
  {
    id: 'adam-spice', kind: 'person', status: 'flown', parent: 'going-public', portrait: 'a',
    title: 'Adam Spice', date: '2018–', place: 'Chief Financial Officer', map: { x: 634, y: 256 },
    intro: 'Rocket Lab’s Chief Financial Officer. He joins in May 2018 from the chip-maker MaxLinear, where he had been CFO since 2011; its revenue grew from about $70 million in 2010 to $421 million in 2017. Three years later, with him as CFO, the company lists on the Nasdaq through its merger with Vector Acquisition Corporation. The level next door is his.',
    fact: 'When he left, MaxLinear’s announcement described Rocket Lab as a privately held launch company based in Huntington Beach. Three years later it was listed on the Nasdaq.',
    after: '',
    sources: ['https://rocketlabcorp.com/about/team/', 'https://rocketlabcorp.com/updates/rocket-lab-appoints-adam-spice-as-chief-financial-officer', 'https://www.maxlinear.com/news/press-releases/2018/maxlinear-announces-the-departure-of-its-cfo-and-r', WP + 'Rocket_Lab'],
  },
];
export const ALL = () => [...LEVELS, ...BONUS, ...PEOPLE];
export const byId = (id: string) => ALL().find((l) => l.id === id)!;
