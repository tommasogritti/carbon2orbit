// Draft content. In the full build this moves to content/levels/<id>/level.yaml (see docs/PROJECT_SPEC.md §5).
export type Kind = 'platform' | 'launch' | 'minigame' | 'card' | 'person';

export interface LevelDef {
  id: string;
  kind: Kind;
  mechanic?: 'platform' | 'launch' | 'hotfire' | 'heli-catch' | 'orbit-raise' | 'sprint' | 'fault-finder' | 'splashdown' | 'cruise' | 'countdown-race' | 'ride' | 'orbit-ops' | 'dual-count' | 'arc-lab';
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
  photo?: { file: string; caption: string; credit: string; page: string; src?: string };
  diagram?: { key: string; caption: string }; // a labelled drawing (art.ts DIAGRAMS) shown on the intro card
  watch?: { url: string; label: string }; // a video on its own site: linked, never copied
  portrait?: string; // people: character prefix of a drawn portrait, used when there is no freely licensed photo
  sources: string[];
  params?: any;
}

const WP = 'https://en.wikipedia.org/wiki/';
const C = 'https://commons.wikimedia.org/wiki/File:';
const RL = 'https://rocketlabcorp.com/';

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
    intro: 'Rocket Lab has a rocket on the drawing board and nowhere to launch it. One contender, in the South Island, already has power and roads. The job of finding something better goes to a young engineer on a team of fewer than fifteen, Shaun D’Mello: “Pete just told me to go find the launch site,” he recalled years later. A map, some trajectory analysis, helicopter rides and long road trips lead to the far end of the Māhia Peninsula, where there is open ocean to the north, the south and the east, and no road at all. The last leg, from the top of the farm to where a pad might go, is 45 minutes by dirt bike. This level is his.',
    how: 'You play Shaun D’Mello, on a trail bike. → throttle, ← brake, Space hops. In the air, ← → tip the bike so both wheels meet the slope: land it on its nose or its tail and you are off. Hop the stumps and the gullies. Sheep will not move for a bike at speed, so slow to a crawl or hop them. Mud drags unless you carry speed into it. Ride through all five survey flags and reach the stake where the land ends. Three stars for a clean run inside 50 seconds. One bubble holds knobbly tyres, which ignore mud and bite for a higher hop, and a blueprint hangs just too high for an ordinary one.',
    fact: 'What he was looking for was empty sea. A rocket drops its stages, and if it fails itself, downrange, so every direction that is clear of land and people is another set of orbits a pad can reach. In D’Mello’s words, they “ran the trajectories and determined there is no better place in all of New Zealand or the majority of the planet”.',
    after: 'Rocket Lab’s account is that once the site was chosen it went from permits to construction in two to three weeks, and that early operations ran from shipping containers. In November 2015 the company named Māhia as its main launch site, and Launch Complex 1 opened there in September 2016. Shaun D’Mello, who joined in 2014, ran the launch control team for Electron’s first flight in 2017 and is now Vice President, Neutron. (The ride itself, its sheep and its gullies are the game’s own picture of those 45 minutes.)',
    egg: 'A shipping container, the first mission control at Māhia. From the same account: Rocket Lab’s mission tracker was built with room for only two digits, and before launch 100 someone had to go back in and add a third.',
    sources: [RL + 'updates/trust-me-its-gonna-take-off-inside-electrons-first-100-launches/', RL + 'about/team/', WP + 'Rocket_Lab_Launch_Complex_1'],
    params: {
      theme: 'farm', par: 50, flagWord: 'SURVEY',
      terrain: [[0, 130], [150, 130], [330, 112], [470, 134], [620, 120], [760, 100], [860, 126], [1000, 132], [1120, 112], [1180, 112], [1300, 130], [1460, 138], [1640, 116], [1760, 96], [1880, 120], [2020, 134], [2160, 118], [2220, 118], [2380, 134], [2560, 126], [2700, 92], [2840, 116], [3000, 128], [3200, 110], [3400, 110]],
      gaps: [[1182, 1226], [2222, 2268]],
      zones: [['mob', 400, 26], ['block', 700, 14], ['bog', 880, 90], ['mob', 1500, 26], ['block', 1690, 14], ['bog', 1900, 100], ['bog', 2400, 110], ['mob', 2900, 26]],
      flags: [[250, 'North: open ocean'], [1040, 'East: open ocean'], [1700, 'South: open ocean'], [2600, 'No road. Bring one'], [3250, 'Room for a pad']],
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
    how: 'Arrows to run, Space to jump. Collect the five things Rosie needs and reach her cell. New here: conveyors. A belt carries you along whether you walk or not, with it or against it, so time your jumps on and off. Jump on runaway sanders and loose rolls of carbon fibre to stop them; wait out the offcuts falling from the trimming heads; duck the clouds of carbon dust. Power-ups float in bubbles: the clean-room suit makes you untouchable, and the carbon-weave jacket makes you light enough to jump far higher. A hidden blueprint unlocks a secret on the map.',
    fact: 'Rosie’s machining window is 3.5 m by 16 m, with five axes of movement plus a sixth that turns the part. The Rutherford engines came from further away: in 2019 they were built at Rocket Lab’s headquarters in Huntington Beach, California, and shipped to New Zealand.',
    after: 'Rosie was unveiled on 13 November 2019. Rocket Lab said she could process every carbon-composite component of an Electron in 12 hours, a job that had taken more than 400 by hand. The six launches of 2019 all reached orbit, and the last of them, “Running Out Of Fingers”, was also the first to steer its first stage back through the atmosphere: the start of the road to recovery.',
    egg: 'Engine number 100. Rocket Lab finished its hundredth Rutherford in July 2019, at its Huntington Beach headquarters in California, and shipped it to New Zealand like all the others. By then seventy of them had already flown.',
    sources: ['https://www.space.com/rocket-lab-rosie-robot-build-rocket-12-hours.html', 'https://satnews.com/2019/11/13/rosie-rocks-rocket-lab/', 'https://techcrunch.com/2019/11/13/rocket-labs-new-rosie-the-robot-speeds-up-launch-vehicle-production-by-a-lot', RL + 'updates/rocket-lab-celebrates-100th-rutherford-engine-build/', 'https://www.thefabricator.com/additivereport/news/additive/rocket-lab-celebrates-completion-of-its-100th-3d-printed-engine', WP + 'List_of_Electron_launches'],
    params: {
      theme: 'factory', width: 80,
      ground: [[0, 14, 9], [17, 31, 9], [34, 48, 9], [51, 79, 9]],
      plats: [[4, 7, 3], [18, 7, 3], [21, 5, 3], [39, 7, 3], [42, 5, 2], [52, 8, 3], [55, 6, 4], [70, 7, 3]],
      belts: [[8, 13, 9, 1], [24, 28, 9, -1], [36, 46, 9, 1], [55, 58, 6, 1]],
      parts: [[5, 6, 'Stage 1 structure'], [22, 4, 'Stage 2 structure'], [40, 6, 'Fairing half'], [56, 5, 'The other fairing half'], [71, 6, 'Rosie’s cutting program']],
      hazards: [], sheep: [], egg: [43, 4], goal: 76,
      enemies: [['roll', 18, 21], ['offcuts', 35, 35], ['dust', 59, 62], ['sander', 64, 67], ['offcuts', 74, 74]],
      powerups: [['L', 10, 6], ['T', 37, 8]], secret: [30, 3],
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
    sources: [RL + 'updates/rocket-lab-launches-16th-mission-completes-booster-recovery/', RL + 'updates/how-to-bring-a-rocket-back-from-space/', 'https://spaceflightnow.com/2020/11/20/rocket-lab-recovers-booster-after-launch-with-30-small-satellites/', WP + 'Peter_Beck'],
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
    id: 'sir-peter', kind: 'card', status: 'flown',
    title: 'Sir Peter', date: '2024-06-03', place: 'Aotearoa New Zealand', map: { x: 187, y: 300 },
    intro: 'In the 2024 King’s Birthday Honours, the apprentice toolmaker from Invercargill is made a Knight Companion of the New Zealand Order of Merit, for services to the aerospace industry, business and education. He is invested on 5 September 2024. In the month of the honours list Electron flies its 50th mission, “No Time Toulouse”.',
    fact: 'Screen time, too: Ashlee Vance’s book “When the Heavens Went on Sale” (2023) and the HBO documentary “Wild Wild Space” (2024) both follow Beck and Rocket Lab.',
    after: '',
    photo: { file: 'beck_knzm.jpg', caption: 'Sir Peter Beck KNZM at his investiture.', credit: 'New Zealand Government, Office of the Governor-General, CC0', page: C + 'Peter_Beck_KNZM_(cropped).jpg' },
    sources: [WP + 'Peter_Beck', WP + 'List_of_Electron_launches'],
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
    intro: 'The medium-lift rocket: 43 m tall, 13 tonnes to low Earth orbit, a carbon-composite first stage 7 m across on nine methane-fuelled Archimedes engines, and a “Hungry Hippo” fairing that stays attached, opens its jaws to let the second stage out, and flies home with the booster. The landing platform is a 122 m barge named Return On Investment. It has not flown yet, and this game will not pretend otherwise.',
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
    id: 'first-hundred', kind: 'card', status: 'flown', parent: 'find-the-launch-site',
    title: 'Inside the first hundred', date: '2017–2026', place: 'Māhia and Auckland', map: { x: 250, y: 206 },
    intro: 'Some of the people Rocket Lab’s own account of its first hundred launches puts in the room. Sandy Tirtey was Electron’s first launch director and directed its first seven launches. Jane McNicoll, in mission management since 2019, worked on roughly ninety of the hundred. Max Prescott joined vehicle integration in January 2018, in time for the first flight to reach orbit. And Murielle Baker, a former Radio New Zealand journalist, is the voice many fans know from the launch webcasts.',
    fact: 'The same account says that after the thirteenth flight was lost in 2020, Sir Peter Beck recorded a personal video apology to the customers whose satellites had been aboard.',
    after: '',
    sources: [RL + 'updates/trust-me-its-gonna-take-off-inside-electrons-first-100-launches/'],
  },
];
/**
 * The cast. Peter Beck is the main character of the whole game. Other people take the lead for a level that is theirs
 * (`hero` on the level), or join as a power-up (`buddy` in a platform level). `pre` is the texture prefix of the sprite set (see art.ts).
 */
export interface Character { id: string; pre: string; name: string; role: string; since: number; likeness: string }
export const CHARACTERS: Character[] = [
  { id: 'peter', pre: '', name: 'Peter Beck', role: 'Founder and CEO', since: 1995, likeness: 'A tall mop of tight dark curls, a broad face, black top and jeans.' },
  { id: 'adam', pre: 'a', name: 'Adam Spice', role: 'Chief Financial Officer', since: 2018, likeness: 'Shaved head, long face with a heavy jaw, pale brows, navy blazer over an open-collar shirt.' },
  { id: 'shaun', pre: 's', name: 'Shaun D’Mello', role: 'Vice President, Neutron', since: 2014, likeness: 'Short dark hair, close at the sides and brushed up on top; clean-shaven; a rounded face with dark brows; blazer over an open-neck white shirt.' },
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
