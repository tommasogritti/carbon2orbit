// Draft content. In the full build this moves to content/levels/<id>/level.yaml (see docs/PROJECT_SPEC.md §5).
export type Kind = 'platform' | 'launch' | 'minigame' | 'card' | 'person';

export interface LevelDef {
  id: string;
  kind: Kind;
  mechanic?: 'platform' | 'launch' | 'hotfire' | 'heli-catch' | 'orbit-raise' | 'sprint' | 'fault-finder' | 'splashdown' | 'cruise' | 'countdown-race';
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
    intro: 'Flight three, and the first with paying customers aboard: six satellites and a drag-sail experiment, for Spire, Fleet Space, GeoOptics and a student CubeSat programme in Irvine, California. It should have flown in April. A first-stage motor controller behaved oddly in a wet dress rehearsal, did it again on the pad in June, and the launch window was given up. Now it is November, and one small kick stage has to hand out every satellite in turn.',
    how: 'The first count will not go to plan. After that, fly it as before: Enter holds the count, ← → on the flight-director cue, ↑ ↓ throttle through Max-Q, Space for each sequence event, Enter for SECO at 500 km apogee, hold Space to circularise with Curie at apogee, Enter when the orbit is round. New here, the DEPLOY SEQUENCE: ← → turn the kick stage until the white dispenser line sits on the green marker, let the body rate settle, then Space releases the next satellite. Every release kicks the stage, so steady it again. A release off the line risks recontact and costs a star.',
    fact: 'Stage two left the stack in a 210 × 500 km orbit inclined 85°; the Curie kick stage circularised it at 500 km before letting anything go. The mission name is widely reported to be a nod to “Business Time” by the New Zealand comedy duo Flight of the Conchords.',
    after: 'Electron lifted off at 16:50 NZDT on 11 November 2018 and delivered all seven payloads: two Lemur-2s for Spire, two Proxima CubeSats for Fleet Space, a CICERO for GeoOptics, IRVINE01 from the Irvine CubeSat STEM Program, and NABEO, a drag-sail demonstrator built by High Performance Space Structure Systems, which stayed on the kick stage. Five weeks later Electron flew again, for NASA: “This One’s For Pickering”. (The order of the releases in the game is its own; the real one was not published.)',
    egg: 'Six for six, every release on its line. One of the six was IRVINE01, from the Irvine CubeSat STEM Program in California: a students’ satellite on Rocket Lab’s first commercial flight.',
    sources: [RL + 'missions/launches/its-business-time/', RL + 'updates/rocket-lab-reaches-orbit-again-deploys-more-satellites/', 'https://spaceflightnow.com/2018/06/27/rocket-labs-first-commercial-launch-scrubbed-again/', 'https://www.geekwire.com/2018/rocket-lab-electron-rocket-sends-satellites-into-orbit-from-new-zealand/'],
    params: {
      vehicle: 'electron', site: 'mahia', goal: { orbit: true, orbit_km: 500, inject_km: 210 }, twist: 'kick-stage', payload: 'Six satellites + NABEO',
      scrub: { at: 5.5, text: 'HOLD · 27 June 2018 · a stage-1 motor controller is misbehaving · stand down', resume: '11 November 2018 · new attempt · T-8' },
      deploy: ['Lemur-2 · Spire', 'Lemur-2 · Spire', 'CICERO · GeoOptics', 'Proxima · Fleet Space', 'Proxima · Fleet Space', 'IRVINE01 · Irvine STEM'],
      sail: 'NABEO drag-sail demonstrator · it stays on the kick stage', sailNote: 'NABEO, the drag-sail demonstrator, stayed bolted to the kick stage.',
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
    id: 'sir-peter', kind: 'card', status: 'flown',
    title: 'Sir Peter', date: '2024-06-03', place: 'Aotearoa New Zealand', map: { x: 187, y: 300 },
    intro: 'In the 2024 King’s Birthday Honours, the apprentice toolmaker from Invercargill is made a Knight Companion of the New Zealand Order of Merit, for services to the aerospace industry, business and education. He is invested on 5 September 2024. In the month of the honours list Electron flies its 50th mission, “No Time Toulouse”.',
    fact: 'Screen time, too: Ashlee Vance’s book “When the Heavens Went on Sale” (2023) and the HBO documentary “Wild Wild Space” (2024) both follow Beck and Rocket Lab.',
    after: '',
    photo: { file: 'beck_knzm.jpg', caption: 'Sir Peter Beck KNZM at his investiture.', credit: 'New Zealand Government, Office of the Governor-General, CC0', page: C + 'Peter_Beck_KNZM_(cropped).jpg' },
    sources: [WP + 'Peter_Beck', WP + 'List_of_Electron_launches'],
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
    id: 'neutron', kind: 'launch', mechanic: 'launch', status: 'announced',
    title: 'Neutron: first flight', date: '2027 (expected)', place: 'LC-3, Wallops Island, Virginia', map: { x: 802, y: 270 },
    intro: 'The medium-lift rocket: 13 tonnes to orbit, a carbon-composite first stage 7 m wide, nine methane-fuelled Archimedes engines, and a “Hungry Hippo” fairing that stays attached, opens its jaws to let the second stage out, and flies home with the booster. The landing platform is a 120 m barge named Return On Investment.',
    fact: 'In October 2026 Rocket Lab said small voids had been found in the composite layers of the first-stage forward dome. Rocket Lab said the process had been corrected, and first flight moved to 2027.',
    after: '',
    sources: [WP + 'Rocket_Lab_Neutron', 'https://www.sec.gov/Archives/edgar/data/0001819994/000181999426000067/rklb-10142026ex991.htm'],
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
];
/**
 * The cast. Peter Beck is the main character of the whole game. Other people take the lead for a level that is theirs
 * (`hero` on the level), or join as a power-up (`buddy` in a platform level). `pre` is the texture prefix of the sprite set (see art.ts).
 */
export interface Character { id: string; pre: string; name: string; role: string; since: number; likeness: string }
export const CHARACTERS: Character[] = [
  { id: 'peter', pre: '', name: 'Peter Beck', role: 'Founder and CEO', since: 1995, likeness: 'A tall mop of tight dark curls, a broad face, black top and jeans.' },
  { id: 'adam', pre: 'a', name: 'Adam Spice', role: 'Chief Financial Officer', since: 2018, likeness: 'Shaved head, long face with a heavy jaw, pale brows, navy blazer over an open-collar shirt.' },
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
