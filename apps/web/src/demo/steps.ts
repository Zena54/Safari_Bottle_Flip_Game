/** Ordered stops for the product tour. Each step opens one real screen. */

export interface TourStep {
  id: string;
  route: string;
  /** `[data-tour]` value. Null centers the card on the screen. */
  target: string | null;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    route: '/',
    target: null,
    title: 'Welcome to Bottle Flip',
    body: 'This is a sample Ethiopian campaign. Nothing here is sent to a mobile network — texts, data, and airtime are simulated.',
  },
  {
    id: 'brand',
    route: '/',
    target: 'brand',
    title: 'The brand slot',
    body: 'The sponsor’s name sits on the home screen. A new campaign fills this slot without a new app.',
  },
  {
    id: 'play',
    route: '/play',
    target: 'charge',
    title: 'Hold, release, land',
    body: 'Hold to charge and release to flip. Land upright on the next crate. A miss ends the run. Next leaves without waiting for a landing.',
  },
  {
    id: 'coins',
    route: '/',
    target: 'coins',
    title: 'Flips become coins',
    body: 'A score turns into coins only after the run is checked. In this demo that check happens on this device.',
  },
  {
    id: 'customize',
    route: '/customize',
    target: 'skins',
    title: 'Skins',
    body: 'Bottles and backgrounds unlock by default, with coins, by level, or from a sponsored mission.',
  },
  {
    id: 'token',
    route: '/t',
    target: 'token',
    title: 'Bottle tokens',
    body: 'A code under the cap counts toward the weekly drop. Try BF-DEMO-01.',
  },
  {
    id: 'login',
    route: '/login',
    target: 'phone',
    title: 'Verify a number',
    body: 'Players enter an Ethiopian mobile number and accept the terms. The text is simulated — any 6 digits continue. No operator is named.',
  },
  {
    id: 'missions',
    route: '/rewards/missions',
    target: 'missions',
    title: 'Missions',
    body: 'The weekly drop needs games, a bottle token, and a verified number. The daily flip mission is ready to claim.',
  },
  {
    id: 'leaderboard',
    route: '/rewards/leaderboard',
    target: 'leaderboard',
    title: 'Leaderboards',
    body: 'Daily, weekly, and monthly boards use Addis Ababa time. Prizes are data and ETB airtime. The sample player is on the board.',
  },
  {
    id: 'reward',
    route: '/rewards/won/demo-data',
    target: 'reward',
    title: 'A reward, delivered',
    body: '100 MB shows as delivered to the sample number. No data actually leaves this page.',
  },
  {
    id: 'settings',
    route: '/settings',
    target: 'settings',
    title: 'Sound and nickname',
    body: 'Players set a leaderboard name and turn sound on or off. The phone on file stays masked.',
  },
  {
    id: 'done',
    route: '/',
    target: null,
    title: 'That’s the loop',
    body: 'Use Tour on the home screen any time to walk it again.',
  },
];
