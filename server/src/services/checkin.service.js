'use strict';

/**
 * Daily Check-In: server-authoritative streaks, the 14-day reward display,
 * milestone reward selection and the rare platform-wide pass.
 *
 * Rules (see docs/spec): one manual claim per calendar day in the platform
 * timezone; the continuous streak has no cap and resets to 1 after a missed
 * day; the display cycle is `((streak - 1) % 14) + 1`; Day 7 / Day 14 claims
 * open a one-time reward choice that is issued through the reward framework.
 */

const pool = require('../db/pool');
const { withTransaction } = require('../db/tx');
const { errors } = require('../utils/HttpError');
const { dateOnly } = require('../utils/dateOnly');
const { calendarDate, shiftDateStr, nextMidnight, daysBetween } = require('../utils/calendarDay');
const checkinConfig = require('./checkinConfig.service');
const rewards = require('./rewards.service');
const { xpProgress } = require('./levels');
const notifications = require('./notifications.service');
const {
  DISPLAY_CYCLE_DAYS,
  MILESTONE_DAYS,
  cycleDay,
  cycleNumber,
  isMilestoneDay,
} = require('../constants/checkin');

// profile.service depends on this module for claims; load it lazily.
function profileService() {
  return require('./profile.service'); // eslint-disable-line global-require
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_e) { return fallback; }
}

function milestoneKey(displayDay) {
  return Number(displayDay) === 14 ? 'day14' : 'day7';
}

/** Reader-level perk from the level table: bonus coins on every check-in. */
function levelBonusCoins(readerLevel) {
  const lvl = Number(readerLevel) || 1;
  if (lvl >= 12) return 15;
  if (lvl >= 3) return 5;
  return 0;
}

function rollPercent(probabilityPercent) {
  const p = Number(probabilityPercent) || 0;
  if (p <= 0) return false;
  if (p >= 100) return true;
  return Math.random() * 100 < p;
}

/** Milestone options a user can pick from, with any campaign override applied. */
function milestoneOptions(config, displayDay, campaign) {
  const key = milestoneKey(displayDay);
  const milestone = config.milestones[key];
  return milestone.options
    .filter((o) => o.enabled !== false)
    .map((o) => {
      const def = { ...o };
      if (def.type === 'NOVEL_PASS' && campaign?.novelPassHours) {
        def.hours = campaign.novelPassHours;
        def.campaignOverride = true;
      }
      const text = rewards.describe(def);
      return {
        key: def.key,
        type: def.type,
        title: def.label || text.title,
        description: text.description,
        amount: def.amount ?? null,
        percent: def.percent ?? null,
        maxDiscountCoins: def.maxDiscountCoins ?? null,
        validDays: def.validDays ?? null,
        bundleSize: def.bundleSize ?? null,
        hours: def.hours ?? null,
        campaignOverride: !!def.campaignOverride,
      };
    });
}

async function userRow(userId, conn = pool, { forUpdate = false } = {}) {
  const [rows] = await conn.execute(
    `SELECT id, display_name, reader_level, xp, current_streak, longest_streak, last_checkin_date,
            total_checkins, bonus_balance
       FROM users WHERE id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [userId],
  );
  return rows[0] || null;
}

/** Streak facts derived from the stored row and today's calendar date. */
function streakFacts(row, today) {
  const yesterday = shiftDateStr(today, -1);
  const last = dateOnly(row.last_checkin_date);
  const stored = Number(row.current_streak) || 0;
  const claimedToday = last === today;
  const continuing = last === yesterday;
  const currentStreak = claimedToday || continuing ? stored : 0;
  const nextStreak = claimedToday ? stored : continuing ? stored + 1 : 1;
  return {
    last,
    claimedToday,
    currentStreak,
    nextStreak,
    displayDay: cycleDay(nextStreak),
    cycle: cycleNumber(nextStreak),
    streakBroken: !!last && !claimedToday && !continuing,
    missedDays: last && !claimedToday && !continuing ? daysBetween(last, today) - 1 : 0,
  };
}

function isClaimedToday(row, config) {
  const tz = config?.timezone || checkinConfig.DEFAULT_CONFIG.timezone;
  return dateOnly(row.last_checkin_date) === calendarDate(tz);
}

async function pendingMilestones(userId, config, campaign, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT dc.id, dc.checkin_date, dc.streak_number, dc.display_day, dc.created_at
       FROM daily_checkins dc
       LEFT JOIN checkin_milestone_claims c ON c.checkin_id = dc.id
      WHERE dc.user_id = ? AND dc.display_day IN (7, 14) AND c.id IS NULL
      ORDER BY dc.checkin_date DESC
      LIMIT 10`,
    [userId],
  );
  return rows.map((r) => ({
    checkinId: r.id,
    date: dateOnly(r.checkin_date),
    streak: Number(r.streak_number),
    displayDay: Number(r.display_day),
    milestone: milestoneKey(r.display_day),
    title: config.milestones[milestoneKey(r.display_day)].title,
    options: milestoneOptions(config, r.display_day, campaign),
  }));
}

async function recentClaims(userId, limit = 30, conn = pool) {
  const [rows] = await conn.execute(
    `SELECT dc.id, dc.checkin_date, dc.streak_number, dc.display_day, dc.xp_awarded, dc.bonus_coins,
            dc.meta, UNIX_TIMESTAMP(dc.created_at) AS created_ts,
            c.selected_reward_type, r.title AS reward_title, r.status AS reward_status
       FROM daily_checkins dc
       LEFT JOIN checkin_milestone_claims c ON c.checkin_id = dc.id
       LEFT JOIN user_rewards r ON r.id = c.reward_id
      WHERE dc.user_id = ?
      ORDER BY dc.checkin_date DESC
      LIMIT ${Math.max(1, Math.min(400, Number(limit) || 30))}`,
    [userId],
  );
  return rows.map((r) => {
    const meta = parseJson(r.meta, {});
    return {
      id: r.id,
      date: dateOnly(r.checkin_date),
      streak: Number(r.streak_number),
      displayDay: Number(r.display_day),
      exp: Number(r.xp_awarded),
      bonusCoins: Number(r.bonus_coins) || 0,
      milestone: isMilestoneDay(r.display_day) ? milestoneKey(r.display_day) : null,
      milestoneClaimed: !!r.selected_reward_type,
      rewardType: r.selected_reward_type || null,
      rewardTitle: r.reward_title || null,
      lucky: meta.lucky || null,
      claimedAt: r.created_ts != null ? new Date(Number(r.created_ts) * 1000).toISOString() : null,
    };
  });
}

function buildTrack(config, facts, campaign) {
  const multiplier = campaign?.expMultiplier || 1;
  return Array.from({ length: DISPLAY_CYCLE_DAYS }, (_, i) => {
    const day = i + 1;
    let state = 'upcoming';
    if (facts.claimedToday) state = day <= facts.displayDay ? 'claimed' : 'upcoming';
    else if (day < facts.displayDay) state = 'claimed';
    else if (day === facts.displayDay) state = 'today';
    const baseExp = config.dailyExp[i];
    const exp = Math.round(baseExp * multiplier);
    const milestone = isMilestoneDay(day) ? milestoneKey(day) : null;
    return {
      day,
      exp,
      baseExp,
      boosted: exp !== baseExp,
      milestone,
      milestoneTitle: milestone ? config.milestones[milestone].title : null,
      rewardOptions: milestone ? milestoneOptions(config, day, campaign).map((o) => o.title) : [],
      state,
    };
  });
}

function campaignSummary(campaign) {
  if (!campaign) return null;
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    expMultiplier: campaign.expMultiplier,
    bonusCoins: campaign.bonusCoins,
    novelPassHours: campaign.novelPassHours,
    endsAt: campaign.endsAt,
  };
}

async function getStatus(userId) {
  const [config, campaign, row] = await Promise.all([
    checkinConfig.getConfig(),
    checkinConfig.activeCampaign(),
    userRow(userId),
  ]);
  if (!row) throw errors.notFound('User not found');

  const today = calendarDate(config.timezone);
  const facts = streakFacts(row, today);
  const [pending, recent, inventory] = await Promise.all([
    pendingMilestones(userId, config, campaign),
    recentClaims(userId, 30),
    rewards.listInventory(userId),
  ]);

  const todayExp = Math.round(config.dailyExp[facts.displayDay - 1] * (campaign?.expMultiplier || 1));
  return {
    enabled: config.enabled,
    timezone: config.timezone,
    today,
    nextResetAt: nextMidnight(config.timezone).toISOString(),
    claimedToday: facts.claimedToday,
    streak: {
      current: facts.currentStreak,
      longest: Math.max(Number(row.longest_streak) || 0, facts.currentStreak),
      total: Number(row.total_checkins) || 0,
      next: facts.nextStreak,
      broken: facts.streakBroken,
      missedDays: facts.missedDays,
      lastCheckInDate: facts.last,
    },
    cycle: {
      number: facts.cycle,
      day: facts.displayDay,
      length: DISPLAY_CYCLE_DAYS,
      cycleExp: config.dailyExp.reduce((a, b) => a + b, 0),
    },
    todayReward: {
      day: facts.displayDay,
      exp: todayExp,
      levelBonusCoins: levelBonusCoins(row.reader_level),
      campaignCoins: campaign?.bonusCoins || 0,
      milestone: isMilestoneDay(facts.displayDay) ? milestoneKey(facts.displayDay) : null,
    },
    track: buildTrack(config, facts, campaign),
    milestones: {
      day7: { title: config.milestones.day7.title, options: milestoneOptions(config, 7, campaign) },
      day14: { title: config.milestones.day14.title, options: milestoneOptions(config, 14, campaign) },
    },
    pendingMilestones: pending,
    recent,
    campaign: campaignSummary(campaign),
    luckyPass: {
      enabled: config.luckyPass.enabled
        && (config.luckyPass.dropProbabilityPercent > 0 || config.luckyPass.upgradeProbabilityPercent > 0),
      hours: config.luckyPass.hours,
      minStreak: config.luckyPass.minStreak,
    },
    inventory: {
      available: inventory.available,
      activePasses: inventory.activePasses,
      availableCount: inventory.available.length,
    },
    level: xpProgress(row.xp),
  };
}

/**
 * Claim today's reward. The whole claim (check-in row, streak update, EXP,
 * campaign coins, lucky drop) commits atomically; the users row is locked so
 * concurrent taps cannot double-issue.
 */
async function claim(userId) {
  const config = await checkinConfig.getConfig();
  if (!config.enabled) throw errors.forbidden('Daily check-in is paused right now');
  const today = calendarDate(config.timezone);

  const outcome = await withTransaction(async (conn) => {
    const row = await userRow(userId, conn, { forUpdate: true });
    if (!row) throw errors.notFound('User not found');
    const facts = streakFacts(row, today);
    if (facts.claimedToday) throw errors.conflict('Already checked in today');

    const campaign = await checkinConfig.activeCampaign(conn);
    const streak = facts.nextStreak;
    const displayDay = cycleDay(streak);
    const baseExp = config.dailyExp[displayDay - 1];
    const exp = Math.round(baseExp * (campaign?.expMultiplier || 1));
    const levelBonus = levelBonusCoins(row.reader_level);
    const campaignCoins = campaign?.bonusCoins || 0;
    const luckyDrop = config.luckyPass.enabled
      && streak >= config.luckyPass.minStreak
      && rollPercent(config.luckyPass.dropProbabilityPercent);
    const meta = {
      baseExp,
      expMultiplier: campaign?.expMultiplier || 1,
      campaignId: campaign?.id || null,
      levelBonusCoins: levelBonus,
      ...(luckyDrop ? { lucky: 'drop' } : {}),
    };

    let checkinId;
    try {
      const [ins] = await conn.execute(
        `INSERT INTO daily_checkins
           (user_id, checkin_date, streak_number, display_day, xp_awarded, bonus_coins, meta)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, today, streak, displayDay, exp, levelBonus + campaignCoins, JSON.stringify(meta)],
      );
      checkinId = ins.insertId;
    } catch (e) {
      if (e && e.code === 'ER_DUP_ENTRY') throw errors.conflict('Already checked in today');
      throw e;
    }

    await conn.execute(
      `UPDATE users
          SET last_checkin_date = ?, current_streak = ?, longest_streak = GREATEST(longest_streak, ?),
              total_checkins = total_checkins + 1, bonus_balance = bonus_balance + ?
        WHERE id = ?`,
      [today, streak, streak, levelBonus, userId],
    );

    const level = await profileService().awardXp(
      userId, 'check_in', exp, { date: today, streak, displayDay, checkinId }, conn,
    );

    let campaignReward = null;
    if (campaignCoins > 0) {
      campaignReward = await rewards.issueReward(
        conn, userId,
        { type: 'COINS', amount: campaignCoins, label: `${campaign.name} bonus` },
        { source: 'checkin_campaign', sourceRef: `checkin:${checkinId}`, meta: { campaignId: campaign.id } },
      );
    }

    let lucky = null;
    if (luckyDrop) {
      lucky = await rewards.issueReward(
        conn, userId,
        { type: 'PLATFORM_WIDE_PASS', hours: config.luckyPass.hours },
        { source: 'checkin_lucky', sourceRef: `checkin:${checkinId}`, meta: { lucky: 'drop', streak } },
      );
    }

    return {
      checkinId,
      streak,
      displayDay,
      exp,
      levelBonus,
      campaignCoins,
      campaignReward,
      lucky,
      level,
      longestStreak: Math.max(Number(row.longest_streak) || 0, streak),
      totalCheckIns: (Number(row.total_checkins) || 0) + 1,
      milestone: isMilestoneDay(displayDay) ? milestoneKey(displayDay) : null,
    };
  });

  // Achievements are idempotent grants; keep them out of the claim transaction.
  // Silent so multi-outcome check-ins can emit one combined celebration.
  const grant = profileService().tryGrantAchievement;
  const streak = outcome.streak;
  const achievementCodes = [];
  if (streak >= 7) achievementCodes.push('streak_7');
  if (streak >= 30) achievementCodes.push('streak_30');
  if (streak >= 100) achievementCodes.push('streak_100');
  if (streak >= 365) achievementCodes.push('streak_365');
  if (outcome.totalCheckIns >= 100) achievementCodes.push('checkins_100');
  if (outcome.totalCheckIns >= 500) achievementCodes.push('checkins_500');
  const earned = [];
  for (const code of achievementCodes) {
    // eslint-disable-next-line no-await-in-loop
    const got = await grant(userId, code, { silent: true }).catch(() => null);
    if (got) earned.push(got);
  }

  let taskAwards = [];
  try {
    const tasks = require('./tasks.service');
    taskAwards = await tasks.safeIngest(userId, { notify: false });
  } catch (err) {
    console.error('[tasks] check-in hook', err && err.message ? err.message : err);
  }

  const achievementDetails = await profileService().achievementsByCodes(userId, earned);
  const groupKey = `checkin:${outcome.checkinId}`;
  const centerItems = [
    {
      type: 'checkin',
      category: 'rewards',
      eventType: 'checkin_claimed',
      dedupeKey: `checkin:claim:${outcome.checkinId}`,
      title: `Day ${outcome.displayDay} check-in claimed`,
      body: `+${outcome.exp} EXP · ${outcome.streak}-day streak`,
      linkUrl: '/check-in',
      metadata: {
        checkinId: outcome.checkinId,
        displayDay: outcome.displayDay,
        streak: outcome.streak,
        exp: outcome.exp,
      },
    },
  ];

  for (const t of taskAwards) {
    centerItems.push({
      type: 'task',
      category: 'tasks',
      eventType: 'task_complete',
      dedupeKey: `task:${t.taskId}:${t.periodKey}`,
      title: `${t.title} complete`,
      body: t.exp > 0 ? `+${t.exp} EXP added to your reader level.` : 'Marked complete.',
      linkUrl: '/tasks',
      metadata: { taskId: t.taskId, code: t.code, exp: t.exp, frequency: t.frequency, periodKey: t.periodKey },
    });
  }
  for (const a of achievementDetails) {
    centerItems.push({
      type: 'badge',
      category: 'achievements',
      eventType: 'achievement_unlocked',
      dedupeKey: `achievement:${a.code}`,
      title: `Achievement unlocked: ${a.title}`,
      body: a.xpReward > 0 ? `+${a.xpReward} EXP added to your reader level.` : null,
      linkUrl: '/account?tab=achievements',
      metadata: { code: a.code, title: a.title, exp: a.xpReward || 0 },
    });
  }
  if (outcome.milestone) {
    centerItems.push({
      type: 'reward',
      category: 'rewards',
      eventType: outcome.milestone === 'day14' ? 'milestone_day14' : 'milestone_day7',
      dedupeKey: `checkin:milestone:${outcome.checkinId}`,
      title: outcome.milestone === 'day14' ? 'Day 14 major milestone reached' : 'Day 7 milestone reached',
      body: 'Choose your milestone reward on the check-in page.',
      linkUrl: '/check-in',
      metadata: { milestone: outcome.milestone, checkinId: outcome.checkinId, displayDay: outcome.displayDay },
    });
  }
  if (outcome.lucky) {
    centerItems.push({
      type: 'reward',
      category: 'rewards',
      eventType: 'lucky_platform_pass',
      dedupeKey: `checkin:lucky:${outcome.checkinId}`,
      title: `Lucky drop: ${outcome.lucky.title}`,
      body: 'It is waiting in your rewards — activate it whenever you like.',
      linkUrl: '/check-in',
      metadata: { rewardId: outcome.lucky.id, title: outcome.lucky.title, hours: outcome.lucky.hours || 72 },
    });
  }

  const wantsCelebration = !!(
    outcome.milestone
    || outcome.lucky
    || achievementDetails.length
    || taskAwards.some((t) => t.frequency === 'weekly' || t.frequency === 'monthly')
  );

  const celebrationOutcomes = [];
  if (outcome.exp) celebrationOutcomes.push({ kind: 'exp', label: `+${outcome.exp} EXP` });
  for (const t of taskAwards) {
    celebrationOutcomes.push({ kind: 'task', label: t.title, exp: t.exp });
  }
  for (const a of achievementDetails) {
    celebrationOutcomes.push({ kind: 'achievement', label: a.title, code: a.code });
  }
  if (outcome.milestone) {
    celebrationOutcomes.push({
      kind: 'milestone',
      label: outcome.milestone === 'day14' ? '14 DAY STREAK' : '7 DAY STREAK',
      milestone: outcome.milestone,
      displayDay: outcome.displayDay,
    });
  }
  if (outcome.lucky) {
    celebrationOutcomes.push({ kind: 'lucky', label: outcome.lucky.title });
  }

  await notifications.notifyBundle(userId, {
    groupKey,
    centerItems,
    celebration: wantsCelebration
      ? {
        type: 'checkin',
        category: 'rewards',
        eventType: 'checkin_celebration',
        dedupeKey: `checkin:celebration:${outcome.checkinId}`,
        title: outcome.milestone === 'day14'
          ? '14 DAY STREAK'
          : outcome.milestone === 'day7'
            ? '7 DAY STREAK'
            : outcome.lucky
              ? 'Lucky platform pass'
              : 'Streak milestone',
        body: [
          `Check-in claimed · +${outcome.exp} EXP`,
          achievementDetails.length ? `${achievementDetails.length} achievement${achievementDetails.length === 1 ? '' : 's'}` : null,
          outcome.lucky ? outcome.lucky.title : null,
        ].filter(Boolean).join(' · '),
        linkUrl: '/check-in',
        metadata: {
          checkinId: outcome.checkinId,
          displayDay: outcome.displayDay,
          streak: outcome.streak,
          exp: outcome.exp,
          milestone: outcome.milestone,
          openMilestoneChoice: !!outcome.milestone,
          lucky: outcome.lucky ? { id: outcome.lucky.id, title: outcome.lucky.title } : null,
          achievements: achievementDetails.map((a) => ({ code: a.code, title: a.title })),
          tasks: taskAwards.map((t) => ({ code: t.code, title: t.title, exp: t.exp, frequency: t.frequency })),
          outcomes: celebrationOutcomes,
        },
      }
      : null,
    toast: !wantsCelebration
      ? {
        type: 'checkin',
        category: 'rewards',
        eventType: 'checkin_claimed',
        dedupeKey: `checkin:toast:${outcome.checkinId}`,
        title: `Day ${outcome.displayDay} claimed · ${outcome.streak}-day streak`,
        body: `+${outcome.exp} EXP`,
        linkUrl: '/check-in',
        metadata: { checkinId: outcome.checkinId, exp: outcome.exp, streak: outcome.streak },
      }
      : null,
  });

  const status = await getStatus(userId);
  return {
    // Legacy shape (header quick check-in, profile dashboard).
    checkedIn: true,
    xpAwarded: outcome.exp,
    currentStreak: outcome.streak,
    longestStreak: outcome.longestStreak,
    level: outcome.level,
    // Full claim summary + refreshed status.
    claim: {
      checkinId: outcome.checkinId,
      date: today,
      streak: outcome.streak,
      displayDay: outcome.displayDay,
      exp: outcome.exp,
      levelBonusCoins: outcome.levelBonus,
      campaignCoins: outcome.campaignCoins,
      milestone: outcome.milestone,
      lucky: outcome.lucky,
      achievements: earned,
      achievementDetails,
      tasks: taskAwards,
    },
    status,
  };
}

/** Pick (once) the reward for a Day 7 / Day 14 check-in. */
async function claimMilestone(userId, checkinId, optionKey) {
  const config = await checkinConfig.getConfig();

  const result = await withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT * FROM daily_checkins WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE',
      [checkinId, userId],
    );
    const checkin = rows[0];
    if (!checkin) throw errors.notFound('Check-in not found');
    if (!isMilestoneDay(checkin.display_day)) throw errors.badRequest('This check-in has no milestone reward');

    const [claimed] = await conn.execute(
      'SELECT id FROM checkin_milestone_claims WHERE checkin_id = ? LIMIT 1',
      [checkinId],
    );
    if (claimed.length) throw errors.conflict('This milestone reward has already been claimed');

    const campaign = await checkinConfig.activeCampaign(conn);
    const key = milestoneKey(checkin.display_day);
    const option = config.milestones[key].options.find((o) => o.key === optionKey && o.enabled !== false);
    if (!option) throw errors.badRequest('Choose one of the available rewards');

    let def = { ...option };
    if (def.type === 'NOVEL_PASS' && campaign?.novelPassHours) def.hours = campaign.novelPassHours;

    let lucky = null;
    if (
      def.type === 'NOVEL_PASS'
      && config.luckyPass.enabled
      && rollPercent(config.luckyPass.upgradeProbabilityPercent)
    ) {
      def = { type: 'PLATFORM_WIDE_PASS', hours: config.luckyPass.hours };
      lucky = 'upgrade';
    }

    const reward = await rewards.issueReward(conn, userId, def, {
      source: 'checkin_milestone',
      sourceRef: `checkin:${checkinId}`,
      meta: { milestone: key, streak: Number(checkin.streak_number), option: option.key, ...(lucky ? { lucky } : {}) },
    });

    try {
      await conn.execute(
        `INSERT INTO checkin_milestone_claims
           (user_id, checkin_id, milestone, streak_number, selected_option, selected_reward_type, reward_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, checkinId, Number(checkin.display_day), Number(checkin.streak_number), option.key, reward.type, reward.id],
      );
    } catch (e) {
      if (e && e.code === 'ER_DUP_ENTRY') throw errors.conflict('This milestone reward has already been claimed');
      throw e;
    }

    let balance = null;
    if (reward.type === 'COINS') {
      const [w] = await conn.execute('SELECT balance FROM wallets WHERE user_id = ? LIMIT 1', [userId]);
      balance = w[0] ? Number(w[0].balance) : null;
    }
    return { reward, lucky, balance, milestone: key, streak: Number(checkin.streak_number) };
  });

  const status = await getStatus(userId);
  return { ...result, status };
}

/** One month of claims for the calendar view. `month` = 'YYYY-MM'. */
async function history(userId, { month } = {}) {
  const config = await checkinConfig.getConfig();
  const today = calendarDate(config.timezone);
  const target = /^\d{4}-\d{2}$/.test(String(month || '')) ? month : today.slice(0, 7);
  const from = `${target}-01`;
  const to = shiftDateStr(from, 40).slice(0, 7) + '-01';

  const [rows] = await pool.execute(
    `SELECT dc.id, dc.checkin_date, dc.streak_number, dc.display_day, dc.xp_awarded, dc.bonus_coins, dc.meta,
            c.selected_reward_type, r.title AS reward_title
       FROM daily_checkins dc
       LEFT JOIN checkin_milestone_claims c ON c.checkin_id = dc.id
       LEFT JOIN user_rewards r ON r.id = c.reward_id
      WHERE dc.user_id = ? AND dc.checkin_date >= ? AND dc.checkin_date < ?
      ORDER BY dc.checkin_date ASC`,
    [userId, from, to],
  );
  const days = rows.map((r) => ({
    id: r.id,
    date: dateOnly(r.checkin_date),
    streak: Number(r.streak_number),
    displayDay: Number(r.display_day),
    exp: Number(r.xp_awarded),
    bonusCoins: Number(r.bonus_coins) || 0,
    milestone: isMilestoneDay(r.display_day) ? milestoneKey(r.display_day) : null,
    milestoneClaimed: !!r.selected_reward_type,
    rewardTitle: r.reward_title || null,
    lucky: parseJson(r.meta, {}).lucky || null,
  }));
  return {
    month: target,
    today,
    days,
    totals: {
      claims: days.length,
      exp: days.reduce((a, d) => a + d.exp, 0),
      bonusCoins: days.reduce((a, d) => a + d.bonusCoins, 0),
    },
  };
}

/** Admin overview for the check-in dashboard. */
async function adminStats() {
  const config = await checkinConfig.getConfig();
  const today = calendarDate(config.timezone);
  const yesterday = shiftDateStr(today, -1);
  const [[counts]] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM daily_checkins WHERE checkin_date = ?) AS claims_today,
       (SELECT COUNT(*) FROM daily_checkins WHERE checkin_date >= ?) AS claims_7d,
       (SELECT COUNT(*) FROM daily_checkins WHERE checkin_date >= ?) AS claims_30d,
       (SELECT COUNT(DISTINCT user_id) FROM daily_checkins WHERE checkin_date >= ?) AS users_30d,
       (SELECT COUNT(*) FROM users WHERE last_checkin_date IN (?, ?)) AS active_streaks,
       (SELECT COUNT(*) FROM user_rewards WHERE status = 'active' AND expires_at > NOW()) AS active_passes,
       (SELECT COUNT(*) FROM daily_checkins dc
          LEFT JOIN checkin_milestone_claims c ON c.checkin_id = dc.id
         WHERE dc.display_day IN (7, 14) AND c.id IS NULL) AS pending_milestones,
       (SELECT COALESCE(SUM(xp_awarded), 0) FROM daily_checkins WHERE checkin_date >= ?) AS exp_30d`,
    [today, shiftDateStr(today, -6), shiftDateStr(today, -29), shiftDateStr(today, -29), today, yesterday, shiftDateStr(today, -29)],
  );
  const [rewardRows] = await pool.execute(
    `SELECT reward_type, COUNT(*) AS c, COALESCE(SUM(CASE WHEN reward_type = 'COINS' THEN amount ELSE 0 END), 0) AS coins
       FROM user_rewards
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY reward_type`,
  );
  const [leaders] = await pool.execute(
    `SELECT id, display_name, avatar_url, current_streak, longest_streak, total_checkins, last_checkin_date
       FROM users
      WHERE longest_streak > 0
      ORDER BY longest_streak DESC, total_checkins DESC
      LIMIT 8`,
  );
  const [daily] = await pool.execute(
    `SELECT checkin_date, COUNT(*) AS c
       FROM daily_checkins
      WHERE checkin_date >= ?
      GROUP BY checkin_date
      ORDER BY checkin_date ASC`,
    [shiftDateStr(today, -13)],
  );
  const dailyMap = new Map(daily.map((r) => [dateOnly(r.checkin_date), Number(r.c)]));
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const date = shiftDateStr(today, i - 13);
    return { date, claims: dailyMap.get(date) || 0 };
  });

  return {
    today,
    timezone: config.timezone,
    claimsToday: Number(counts.claims_today),
    claims7d: Number(counts.claims_7d),
    claims30d: Number(counts.claims_30d),
    users30d: Number(counts.users_30d),
    activeStreaks: Number(counts.active_streaks),
    activePasses: Number(counts.active_passes),
    pendingMilestones: Number(counts.pending_milestones),
    exp30d: Number(counts.exp_30d),
    rewards30d: rewardRows.map((r) => ({ type: r.reward_type, count: Number(r.c), coins: Number(r.coins) })),
    leaders: leaders.map((u) => ({
      id: u.id,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      currentStreak: Number(u.current_streak),
      longestStreak: Number(u.longest_streak),
      totalCheckIns: Number(u.total_checkins),
      lastCheckInDate: dateOnly(u.last_checkin_date),
    })),
    last14,
  };
}

module.exports = {
  MILESTONE_DAYS,
  getStatus,
  claim,
  claimMilestone,
  history,
  adminStats,
  isClaimedToday,
  streakFacts,
  levelBonusCoins,
};
