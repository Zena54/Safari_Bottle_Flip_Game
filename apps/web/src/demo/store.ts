/**
 * In-memory stand-in for the API. The demo never sends SMS, data, or airtime.
 */
import {
  coinsFor,
  describeReward,
  levelFor,
  seedBackgrounds,
  seedBottles,
  seedCampaign,
  seedMissions,
  type Background,
  type Bottle,
  type LeaderboardPeriod,
  type Mission,
  type MissionStep,
  type Reward,
} from '@bottle-flip/content';
import { randomSeed } from '@bottle-flip/engine';
import {
  isOwned,
  itemStatus,
  maskEthiopianPhone,
  normalizeEthiopianPhone,
  windowFor,
  type CatalogResponse,
  type ClaimResponse,
  type LeaderboardResponse,
  type MeResponse,
  type MissionStepView,
  type MissionView,
  type MissionsResponse,
  type OtpRequestResponse,
  type OtpVerifyResponse,
  type PatchMeBody,
  type RewardView,
  type RunStartResponse,
  type RunSubmitBody,
  type RunSubmitResponse,
  type SessionResponse,
  type TokenInfoResponse,
  type TokenRedeemResult,
} from '@bottle-flip/shared';

export class DemoFault extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DemoFault';
  }
}

const PLAYER_ID = 'demo-player';
const ACCESS_TOKEN = 'demo';
const DEMO_PHONE = '+251911234678';
const DEMO_CODE = 'BF-DEMO-01';
const DEMO_AT = '2026-10-20T09:00:00.000Z';

const RIVALS = [
  { name: 'Hanna', flips: 42 },
  { name: 'Dawit', flips: 37 },
  { name: 'Meron', flips: 29 },
  { name: 'Yonas', flips: 16 },
  { name: 'Sara', flips: 11 },
];

interface PeriodStats {
  games: number;
  bestRunFlips: number;
  bestStreak: number;
  tokensRedeemed: number;
}

interface DemoState {
  nickname: string | null;
  phone: string;
  verified: boolean;
  coins: number;
  bestFlips: number;
  lifetimeFlips: number;
  equippedBottleId: string;
  equippedBackgroundId: string;
  sound: boolean;
  ownedIds: Set<string>;
  stats: Record<'daily' | 'weekly' | 'monthly' | 'once', PeriodStats>;
  dayStreak: number;
  claimed: Set<string>;
  tokenRedeemed: boolean;
  runs: Set<string>;
  rewards: Map<string, RewardView>;
}

function freshReward(phone: string): RewardView {
  const reward: Reward = { type: 'data', amountMb: 100, costKes: 20 };
  return {
    id: 'demo-data',
    status: 'credited',
    description: describeReward(reward),
    reward,
    maskedPhone: maskEthiopianPhone(phone),
    provider: 'Demo',
    createdAt: DEMO_AT,
    creditedAt: DEMO_AT,
  };
}

function fresh(): DemoState {
  const phone = DEMO_PHONE;
  const reward = freshReward(phone);
  return {
    nickname: 'Abel',
    phone,
    verified: true,
    coins: 420,
    bestFlips: 20,
    lifetimeFlips: 86,
    equippedBottleId: 'classic',
    equippedBackgroundId: 'night-soda',
    sound: true,
    ownedIds: new Set(),
    stats: {
      daily: { games: 1, bestRunFlips: 20, bestStreak: 3, tokensRedeemed: 0 },
      weekly: { games: 3, bestRunFlips: 20, bestStreak: 3, tokensRedeemed: 0 },
      monthly: { games: 6, bestRunFlips: 20, bestStreak: 3, tokensRedeemed: 0 },
      once: { games: 8, bestRunFlips: 20, bestStreak: 2, tokensRedeemed: 0 },
    },
    dayStreak: 2,
    claimed: new Set(),
    tokenRedeemed: false,
    runs: new Set(),
    rewards: new Map([[reward.id, reward]]),
  };
}

let state = fresh();

export function demoReset() {
  state = fresh();
}

function campaignView(): NonNullable<MeResponse['campaign']> {
  return {
    id: seedCampaign.id,
    brand: seedCampaign.brand,
    name: seedCampaign.name,
    timezone: seedCampaign.timezone,
    endsAt: seedCampaign.endsAt,
  };
}

function playerView(): MeResponse['player'] {
  return {
    id: PLAYER_ID,
    nickname: state.nickname,
    maskedPhone: state.verified ? maskEthiopianPhone(state.phone) : null,
    verified: state.verified,
    coins: state.coins,
    bestFlips: state.bestFlips,
    lifetimeFlips: state.lifetimeFlips,
    level: levelFor(state.lifetimeFlips),
    equippedBottleId: state.equippedBottleId,
    equippedBackgroundId: state.equippedBackgroundId,
    sound: state.sound,
  };
}

function me(): MeResponse {
  return { player: playerView(), campaign: campaignView() };
}

export function demoSession(): SessionResponse {
  return { ...me(), accessToken: ACCESS_TOKEN };
}

function catalog(): CatalogResponse {
  const level = levelFor(state.lifetimeFlips);
  const bottles = seedBottles.map((item) => ({
    item,
    ...itemStatus(item, { ownedIds: state.ownedIds, level, equippedId: state.equippedBottleId }),
  }));
  const backgrounds = seedBackgrounds.map((item) => ({
    item,
    ...itemStatus(item, { ownedIds: state.ownedIds, level, equippedId: state.equippedBackgroundId }),
  }));
  return { bottles, backgrounds, coins: state.coins, level };
}

function findItem(id: string): Bottle | Background | undefined {
  return seedBottles.find((b) => b.id === id) ?? seedBackgrounds.find((b) => b.id === id);
}

function stepView(step: MissionStep, stats: PeriodStats): MissionStepView {
  const view = (label: string, current: number, target: number): MissionStepView => ({
    type: step.type,
    label,
    current: Math.min(current, target),
    target,
    done: current >= target,
  });
  switch (step.type) {
    case 'play_games':
      return view(`Play ${step.count} games`, stats.games, step.count);
    case 'flips_in_run':
      return view(`Land ${step.count} flips in one run`, stats.bestRunFlips, step.count);
    case 'perfect_streak':
      return view(`${step.count} PERFECT landings in a row`, stats.bestStreak, step.count);
    case 'play_days_in_row':
      return view(`Play ${step.count} days in a row`, state.dayStreak, step.count);
    case 'redeem_token':
      return view(`Scan a ${seedCampaign.brand} drink token`, stats.tokensRedeemed, 1);
    case 'verify_phone':
      return view('Verify your phone number', state.verified ? 1 : 0, 1);
  }
}

function evaluate(mission: Mission, now = new Date()): MissionView {
  const w = windowFor(mission.period, now, seedCampaign.timezone);
  const stats = state.stats[mission.period];
  const steps = mission.steps.map((s) => stepView(s, stats));
  const complete = steps.every((s) => s.done);
  const claimed = state.claimed.has(`${mission.id}:${w.key}`);
  return {
    id: mission.id,
    title: mission.title,
    kind: mission.kind,
    period: mission.period,
    periodKey: w.key,
    endsAt: mission.period === 'once' ? null : w.end.toISOString(),
    steps,
    reward: describeReward(mission.reward),
    rewardType: mission.reward.type,
    complete,
    claimed,
    claimable: complete && !claimed && (!mission.requiresVerified || state.verified),
    requiresVerified: mission.requiresVerified,
  };
}

function missions(): MissionsResponse {
  return { missions: seedMissions.map((m) => evaluate(m)) };
}

function weeklyGames(): { current: number; target: number } | null {
  for (const m of seedMissions) {
    const step = m.steps.find((s) => s.type === 'play_games');
    if (m.period === 'weekly' && step && step.type === 'play_games') {
      return { current: Math.min(state.stats.weekly.games, step.count), target: step.count };
    }
  }
  return null;
}

function leaderboard(period: LeaderboardPeriod): LeaderboardResponse {
  const window = windowFor(period, new Date(), seedCampaign.timezone);
  const flips = period === 'daily' ? state.stats.daily.bestRunFlips : state.bestFlips;
  const mine = { name: state.nickname ?? 'You', flips, you: true as const };
  const rows = [...RIVALS.map((r) => ({ ...r, you: false as const })), mine].sort(
    (a, b) => b.flips - a.flips || Number(a.you) - Number(b.you),
  );
  const ranked = rows.map((r, i) => ({ rank: i + 1, name: r.name, flips: r.flips, you: r.you }));
  const you = ranked.find((r) => r.you)!;
  const bands = seedCampaign.prizes[period] ?? [];
  return {
    period,
    windowKey: window.key,
    resetsAt: window.end.toISOString(),
    rows: ranked,
    you: { rank: state.verified ? you.rank : null, flips: you.flips, ranked: state.verified },
    prizes: bands.map((b) => ({
      label: b.fromRank === b.toRank ? `#${b.fromRank}` : `#${b.fromRank}–${b.toRank}`,
      reward: describeReward(b.reward),
    })),
  };
}

function normalizeToken(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

function tokenInfo(raw: string): TokenInfoResponse {
  const code = normalizeToken(raw);
  if (code !== DEMO_CODE) {
    return { code, valid: false, reason: 'not_found', validUntil: null, campaign: null, remaining: 0, total: 0 };
  }
  const reason = state.tokenRedeemed ? 'redeemed' : null;
  return {
    code,
    valid: reason === null,
    reason,
    validUntil: seedCampaign.endsAt,
    campaign: { brand: seedCampaign.brand, name: seedCampaign.name, dailyCapMb: seedCampaign.dailyCapMb },
    remaining: state.tokenRedeemed ? 41 : 42,
    total: 100,
  };
}

function redeemToken(raw: string): TokenRedeemResult {
  const code = normalizeToken(raw);
  if (!state.verified) throw new DemoFault(403, 'verify_required', 'Verify your number to use a token');
  if (code !== DEMO_CODE) return { code, ok: false, reason: 'not_found' };
  if (state.tokenRedeemed) return { code, ok: true, reason: 'already_yours' };
  state.tokenRedeemed = true;
  for (const key of ['daily', 'weekly', 'monthly', 'once'] as const) state.stats[key].tokensRedeemed += 1;
  return { code, ok: true, reason: null };
}

function noteRun(flips: number, perfects: number) {
  for (const key of ['daily', 'weekly', 'monthly', 'once'] as const) {
    const stats = state.stats[key];
    stats.games += 1;
    stats.bestRunFlips = Math.max(stats.bestRunFlips, flips);
  }
  const coinsEarned = coinsFor(flips, perfects);
  state.coins += coinsEarned;
  state.lifetimeFlips += flips;
  const newBest = flips > state.bestFlips;
  if (newBest) state.bestFlips = flips;
  return { coinsEarned, newBest };
}

function claim(id: string): ClaimResponse {
  const mission = seedMissions.find((m) => m.id === id);
  if (!mission) throw new DemoFault(404, 'unknown_mission', 'That mission is not in this campaign.');
  const view = evaluate(mission);
  if (view.claimed) throw new DemoFault(409, 'already_claimed', 'Already claimed.');
  if (!view.complete) throw new DemoFault(409, 'not_complete', 'Finish the steps before claiming.');
  if (mission.requiresVerified && !state.verified) throw new DemoFault(403, 'verify_required', 'Verify your number to claim this.');
  state.claimed.add(`${mission.id}:${view.periodKey}`);

  let rewardId: string | null = null;
  const unlockedItemIds: string[] = [];
  const reward = mission.reward;
  if (reward.type === 'coins') state.coins += reward.amount;
  else if (reward.type === 'item') {
    if (!state.ownedIds.has(reward.itemId)) {
      state.ownedIds.add(reward.itemId);
      unlockedItemIds.push(reward.itemId);
    }
  } else {
    rewardId = crypto.randomUUID();
    const now = new Date().toISOString();
    state.rewards.set(rewardId, {
      id: rewardId,
      status: 'credited',
      description: describeReward(reward),
      reward,
      maskedPhone: maskEthiopianPhone(state.phone),
      provider: 'Demo',
      createdAt: now,
      creditedAt: now,
    });
  }
  return { mission: evaluate(mission), rewardId, coins: state.coins, unlockedItemIds };
}

function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

function route(method: string, seg: string[], query: URLSearchParams, body: unknown): unknown {
  if (method === 'POST' && seg[0] === 'sessions') return demoSession();
  if (method === 'POST' && seg[0] === 'auth' && seg[1] === 'refresh') return demoSession();
  if (method === 'POST' && seg[0] === 'auth' && seg[1] === 'logout') {
    demoReset();
    return { ok: true };
  }
  if (method === 'POST' && seg[0] === 'auth' && seg[1] === 'otp' && seg[2] === 'request') {
    const phone = normalizeEthiopianPhone(String(asObject(body).phone ?? ''));
    if (!phone) throw new DemoFault(400, 'invalid_phone', 'Enter an Ethiopian mobile number like 0911 234 567');
    const res: OtpRequestResponse = { maskedPhone: maskEthiopianPhone(phone), resendInSeconds: 0, expiresInSeconds: 300 };
    return res;
  }
  if (method === 'POST' && seg[0] === 'auth' && seg[1] === 'otp' && seg[2] === 'verify') {
    const raw = asObject(body);
    const phone = normalizeEthiopianPhone(String(raw.phone ?? ''));
    const code = String(raw.code ?? '');
    if (!phone) throw new DemoFault(400, 'invalid_phone', 'Enter an Ethiopian mobile number like 0911 234 567');
    if (!/^\d{6}$/.test(code)) throw new DemoFault(400, 'bad_code', 'Enter the 6-digit code.');
    state.phone = phone;
    state.verified = true;
    const tokenRaw = typeof raw.token === 'string' ? raw.token : '';
    const token = tokenRaw.trim() ? redeemToken(tokenRaw) : null;
    const res: OtpVerifyResponse = { ...demoSession(), merged: false, token };
    return res;
  }
  if (seg[0] === 'me' && method === 'GET') return me();
  if (seg[0] === 'me' && method === 'PATCH') {
    const patch = body as PatchMeBody;
    if (patch.nickname !== undefined) state.nickname = patch.nickname;
    if (patch.sound !== undefined) state.sound = patch.sound;
    if (patch.equippedBottleId) {
      const item = seedBottles.find((b) => b.id === patch.equippedBottleId);
      if (!item || !isOwned(item, { ownedIds: state.ownedIds, level: levelFor(state.lifetimeFlips) })) {
        throw new DemoFault(409, 'item_locked', 'That bottle is still locked.');
      }
      state.equippedBottleId = patch.equippedBottleId;
    }
    if (patch.equippedBackgroundId) {
      const item = seedBackgrounds.find((b) => b.id === patch.equippedBackgroundId);
      if (!item || !isOwned(item, { ownedIds: state.ownedIds, level: levelFor(state.lifetimeFlips) })) {
        throw new DemoFault(409, 'item_locked', 'That background is still locked.');
      }
      state.equippedBackgroundId = patch.equippedBackgroundId;
    }
    return me();
  }
  if (seg[0] === 'catalog' && method === 'GET') return catalog();
  if (method === 'POST' && seg[0] === 'items' && seg[2] === 'buy') {
    const item = findItem(seg[1] ?? '');
    if (!item) throw new DemoFault(404, 'unknown_item', 'That item is not in the catalog.');
    if (item.unlock.type !== 'coins') throw new DemoFault(409, 'not_for_sale', 'That item is not for sale.');
    if (state.ownedIds.has(item.id)) throw new DemoFault(409, 'already_owned', 'You already own that.');
    if (state.coins < item.unlock.cost) throw new DemoFault(409, 'not_enough_coins', 'Not enough coins.');
    state.coins -= item.unlock.cost;
    state.ownedIds.add(item.id);
    return catalog();
  }
  if (method === 'POST' && seg[0] === 'runs' && seg[1] === 'start') {
    const runId = crypto.randomUUID();
    state.runs.add(runId);
    const res: RunStartResponse = { runId, seed: randomSeed() };
    return res;
  }
  if (method === 'POST' && seg[0] === 'runs' && seg[2] === 'submit') {
    const runId = seg[1] ?? '';
    if (!state.runs.has(runId)) throw new DemoFault(404, 'unknown_run', 'That run has already been saved.');
    const claimed = (body as RunSubmitBody).claimed;
    if (!claimed || typeof claimed.flips !== 'number') throw new DemoFault(400, 'bad_request', 'That run could not be read.');
    state.runs.delete(runId);
    const { coinsEarned, newBest } = noteRun(claimed.flips, claimed.perfects);
    const res: RunSubmitResponse = {
      flips: claimed.flips,
      perfects: claimed.perfects,
      maxStreak: 0,
      coinsEarned,
      coins: state.coins,
      bestFlips: state.bestFlips,
      newBest,
      weeklyGames: weeklyGames(),
    };
    return res;
  }
  if (method === 'GET' && seg[0] === 'leaderboard') {
    const period = query.get('period');
    if (period !== 'daily' && period !== 'weekly' && period !== 'monthly') {
      throw new DemoFault(400, 'bad_period', 'Choose a daily, weekly, or monthly board.');
    }
    return leaderboard(period);
  }
  if (method === 'GET' && seg[0] === 'missions' && seg.length === 1) return missions();
  if (method === 'POST' && seg[0] === 'missions' && seg[2] === 'claim') return claim(seg[1] ?? '');
  if (method === 'GET' && seg[0] === 'tokens' && seg[1]) return tokenInfo(seg[1]);
  if (method === 'POST' && seg[0] === 'tokens' && seg[2] === 'redeem') return redeemToken(seg[1] ?? '');
  if (method === 'GET' && seg[0] === 'rewards' && seg[1]) {
    const reward = state.rewards.get(seg[1]);
    if (!reward) throw new DemoFault(404, 'unknown_reward', 'That reward is not on this device.');
    return { ...reward, maskedPhone: state.verified ? maskEthiopianPhone(state.phone) : reward.maskedPhone };
  }
  throw new DemoFault(404, 'not_found', 'That demo action does not exist.');
}

/** Handles one API path against the in-memory campaign. Never touches the network. */
export function demoCall<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const q = path.indexOf('?');
  const pathname = q === -1 ? path : path.slice(0, q);
  const query = new URLSearchParams(q === -1 ? '' : path.slice(q + 1));
  const seg = pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
  return Promise.resolve(route(method, seg, query, init.body) as T);
}
