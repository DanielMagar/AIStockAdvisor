const controls = {
  priceChange: document.getElementById('price-change'),
  maSpread: document.getElementById('ma-spread'),
  rsi: document.getElementById('rsi'),
  volume: document.getElementById('volume'),
  volatility: document.getElementById('volatility')
};

const vals = {
  priceChange: document.getElementById('price-change-val'),
  maSpread: document.getElementById('ma-spread-val'),
  rsi: document.getElementById('rsi-val'),
  volume: document.getElementById('volume-val'),
  volatility: document.getElementById('volatility-val')
};

const marketBias = document.getElementById('market-bias');
const bullScore = document.getElementById('bull-score');
const biasFill = document.getElementById('bias-fill');
const biasNote = document.getElementById('bias-note');
const practicalPrice = document.getElementById('practical-price');
const practicalMa = document.getElementById('practical-ma');
const practicalRsi = document.getElementById('practical-rsi');
const practicalVolume = document.getElementById('practical-volume');
const practicalVolatility = document.getElementById('practical-volatility');
const practicalAction = document.getElementById('practical-action');
const marketContext = document.getElementById('market-context');
const marketExample = document.getElementById('market-example');
const confluenceScore = document.getElementById('confluence-score');
const confluenceAdvice = document.getElementById('confluence-advice');
const indiaPreset = document.getElementById('india-preset');
const applyPresetBtn = document.getElementById('apply-preset-btn');
const presetNote = document.getElementById('preset-note');
const generatePlanBtn = document.getElementById('generate-plan-btn');
const tradePlanOutput = document.getElementById('trade-plan-output');
const copyPlanBtn = document.getElementById('copy-plan-btn');

const indianPresets = {
  nifty_pullback: {
    priceChange: 1.8,
    maSpread: 4.2,
    rsi: 54,
    volume: 112,
    volatility: 22,
    note: 'Nifty 50 pullback setup: healthy trend + moderate momentum + controlled volatility.'
  },
  banknifty_breakout: {
    priceChange: 3.9,
    maSpread: 5.5,
    rsi: 64,
    volume: 138,
    volatility: 30,
    note: 'BankNifty breakout setup: stronger momentum/volume, but volatility is higher so size smaller.'
  },
  defensive_sip: {
    priceChange: 0.8,
    maSpread: 2.6,
    rsi: 51,
    volume: 102,
    volatility: 18,
    note: 'Defensive swing/SIP blend: lower volatility and balanced momentum for gradual entries.'
  },
  high_beta_momentum: {
    priceChange: 5.2,
    maSpread: 7.1,
    rsi: 72,
    volume: 152,
    volatility: 39,
    note: 'High beta momentum: strong trend but overheated risk profile; requires strict risk control.'
  }
};

function applyIndianPreset(presetKey) {
  const preset = indianPresets[presetKey];
  if (!preset) return false;

  controls.priceChange.value = String(preset.priceChange);
  controls.maSpread.value = String(preset.maSpread);
  controls.rsi.value = String(preset.rsi);
  controls.volume.value = String(preset.volume);
  controls.volatility.value = String(preset.volatility);

  if (presetNote) {
    presetNote.textContent = `Preset applied: ${preset.note}`;
  }
  calculateBias();
  return true;
}

function syncPresetAvailability() {
  const isIndia = (marketContext?.value || 'india') === 'india';
  if (indiaPreset) indiaPreset.disabled = !isIndia;
  if (applyPresetBtn) applyPresetBtn.disabled = !isIndia;
  if (presetNote && !isIndia) {
    presetNote.textContent = 'Indian presets are available only in India (NSE/BSE) context.';
  } else if (presetNote && !indiaPreset?.value) {
    presetNote.textContent = 'Choose a preset to auto-fill values for common Indian setups.';
  }
}

function calculateBias() {
  const price = Number(controls.priceChange.value);
  const ma = Number(controls.maSpread.value);
  const rsi = Number(controls.rsi.value);
  const volume = Number(controls.volume.value);
  const volatility = Number(controls.volatility.value);
  const market = marketContext?.value || 'india';

  vals.priceChange.textContent = price;
  vals.maSpread.textContent = ma;
  vals.rsi.textContent = rsi;
  vals.volume.textContent = volume;
  vals.volatility.textContent = volatility;

  let score = 50;

  score += price * 2.1;
  score += ma * 1.7;
  score += (volume - 100) * 0.16;
  score -= (volatility - 25) * 0.85;

  if (rsi >= 45 && rsi <= 65) score += 8;
  else if (rsi > 75) score -= 9;
  else if (rsi < 30) score += 4;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label = 'Neutral';
  let note = 'Signals are mixed. Wait for stronger confirmation before acting.';

  if (score >= 65) {
    label = 'Bullish';
    note = 'Momentum and trend indicators are aligned upward with manageable risk.';
  } else if (score <= 38) {
    label = 'Bearish';
    note = 'Trend is weak and risk is elevated. Protect capital and wait for stability.';
  }

  marketBias.textContent = `Bias: ${label}`;
  bullScore.textContent = String(score);
  biasFill.style.width = `${score}%`;
  biasNote.textContent = note;

  practicalPrice.textContent = price >= 3
    ? 'Now: Strong positive move. Avoid chasing; prefer pullback entry.'
    : price >= 0
      ? 'Now: Mild positive move.'
      : 'Now: Negative move. Wait for base/reversal confirmation.';

  practicalMa.textContent = ma >= 4
    ? 'Now: Strong uptrend structure (50DMA clearly above 200DMA).'
    : ma >= 0
      ? 'Now: Trend is supportive.'
      : 'Now: Trend is weak/cautious (50DMA below 200DMA).';

  practicalRsi.textContent = rsi > 70
    ? 'Now: Overheated zone. Risk of short-term pullback.'
    : rsi >= 45
      ? 'Now: Neutral-strength zone.'
      : 'Now: Weak momentum. Need stronger confirmation.';

  practicalVolume.textContent = volume >= 120
    ? 'Now: Strong participation. Moves are more reliable.'
    : volume >= 100
      ? 'Now: Participation is above average.'
      : 'Now: Low participation. Signals are less reliable.';

  practicalVolatility.textContent = volatility > 35
    ? 'Now: High risk swings. Use smaller size and wider stop.'
    : 'Now: Risk is manageable.';

  if (score >= 70 && rsi <= 70 && ma >= 0 && volatility <= 35) {
    practicalAction.textContent = market === 'india'
      ? 'Action now: Setup is healthy for NSE/BSE. Consider phased entry and strict stop-loss near swing low.'
      : 'Action now: Setup is healthy for US markets. Consider phased entry with strict stop-loss below structure.';
  } else if (score <= 40 || ma < 0 || volatility > 40) {
    practicalAction.textContent = 'Action now: High caution. Prefer wait-and-watch or very small risk.';
  } else {
    practicalAction.textContent = 'Action now: Mixed setup. Keep position small and wait for clearer confirmation.';
  }

  const factors = [
    ma > 0,
    rsi >= 45 && rsi <= 65,
    volume >= 110,
    volatility <= 35
  ];
  const passed = factors.filter(Boolean).length;
  const quality = passed >= 4 ? 'Strong setup quality' : passed >= 3 ? 'Good setup quality' : passed >= 2 ? 'Average setup quality' : 'Weak setup quality';
  confluenceScore.textContent = `Confluence score: ${passed}/4 (${quality})`;
  confluenceAdvice.textContent = passed >= 4
    ? 'Advice: Conditions are aligned. Enter in tranches, pre-define stop and target.'
    : passed >= 3
      ? 'Advice: Setup is tradeable but not perfect. Use smaller size and tighter risk control.'
      : 'Advice: Wait for better alignment instead of forcing an entry.';

  marketExample.textContent = market === 'india'
    ? 'Example (India): If RELIANCE.NS or HDFCBANK.NS is above 200DMA with RSI 50-60 and rising volume, bias is usually constructive.'
    : 'Example (US): If MSFT or AAPL is above 200DMA with RSI 50-60 and rising volume, bias is usually constructive.';
}

Object.values(controls).forEach((el) => {
  el?.addEventListener('input', calculateBias);
});
marketContext?.addEventListener('change', calculateBias);
marketContext?.addEventListener('change', syncPresetAvailability);
marketContext?.addEventListener('change', generateTradePlan);

applyPresetBtn?.addEventListener('click', () => {
  const key = indiaPreset?.value || '';
  if (!key) {
    if (presetNote) presetNote.textContent = 'Pick a preset first, then click Apply Preset.';
    return;
  }
  applyIndianPreset(key);
});

indiaPreset?.addEventListener('change', () => {
  const key = indiaPreset.value;
  if (!key) {
    if (presetNote) presetNote.textContent = 'Choose a preset to auto-fill values for common Indian setups.';
    return;
  }
  applyIndianPreset(key);
});

calculateBias();
syncPresetAvailability();

const quizButtons = document.querySelectorAll('.quiz-btn');
const quizFeedback = document.getElementById('quiz-feedback');
const checklistBoxes = document.querySelectorAll('.precheck');
const checklistStatus = document.getElementById('checklist-status');
const capitalInput = document.getElementById('capital');
const riskPctInput = document.getElementById('risk-pct');
const entryInput = document.getElementById('entry-price');
const stopInput = document.getElementById('stop-price');
const maxLossEl = document.getElementById('max-loss');
const riskPerShareEl = document.getElementById('risk-per-share');
const positionSizeEl = document.getElementById('position-size');
let latestTradePlanText = '';

quizButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const ans = btn.getAttribute('data-answer');
    if (ans === 'bear') {
      quizFeedback.textContent = 'Correct. Those are classic short-term bearish signals.';
      quizFeedback.style.color = '#10b981';
    } else {
      quizFeedback.textContent = 'Not quite. Below-200DMA + weak RSI + down-volume pressure is usually bearish.';
      quizFeedback.style.color = '#ef4444';
    }
  });
});

function updateChecklistStatus() {
  const done = Array.from(checklistBoxes).filter((box) => box.checked).length;
  checklistStatus.textContent = `${done}/5 complete. ${done === 5 ? 'Good discipline. You are ready to place a planned trade.' : 'Finish your checklist before entering a trade.'}`;
}

checklistBoxes.forEach((box) => box.addEventListener('change', updateChecklistStatus));
updateChecklistStatus();

function updateRiskCalc() {
  const capital = Number(capitalInput.value) || 0;
  const riskPct = Number(riskPctInput.value) || 0;
  const entry = Number(entryInput.value) || 0;
  const stop = Number(stopInput.value) || 0;

  const maxLoss = capital * (riskPct / 100);
  const riskPerShare = Math.abs(entry - stop);
  const qty = riskPerShare > 0 ? Math.floor(maxLoss / riskPerShare) : 0;

  maxLossEl.textContent = maxLoss.toFixed(2);
  riskPerShareEl.textContent = riskPerShare.toFixed(2);
  positionSizeEl.textContent = String(Math.max(0, qty));
}

[capitalInput, riskPctInput, entryInput, stopInput].forEach((el) => {
  el?.addEventListener('input', updateRiskCalc);
});

updateRiskCalc();

function formatNum(num) {
  return Number(num).toFixed(2);
}

function generateTradePlan() {
  const market = marketContext?.value || 'india';
  const price = Number(controls.priceChange.value);
  const ma = Number(controls.maSpread.value);
  const rsi = Number(controls.rsi.value);
  const volume = Number(controls.volume.value);
  const volatility = Number(controls.volatility.value);

  const entry = Number(entryInput?.value) || 0;
  const stop = Number(stopInput?.value) || 0;
  const capital = Number(capitalInput?.value) || 0;
  const riskPct = Number(riskPctInput?.value) || 0;
  const maxLoss = capital * (riskPct / 100);
  const riskPerShare = Math.abs(entry - stop);
  const qty = riskPerShare > 0 ? Math.floor(maxLoss / riskPerShare) : 0;

  const trendPass = ma > 0;
  const momentumPass = rsi >= 45 && rsi <= 65;
  const volumePass = volume >= 110;
  const volatilityPass = volatility <= 35;
  const passed = [trendPass, momentumPass, volumePass, volatilityPass].filter(Boolean).length;
  const setupQuality = passed >= 4 ? 'Strong' : passed >= 3 ? 'Good' : passed >= 2 ? 'Average' : 'Weak';

  const bullishBias = Number(bullScore?.textContent || '50');
  const side = bullishBias >= 65 ? 'Long Bias' : bullishBias <= 38 ? 'Defensive / No Long' : 'Neutral / Wait for Confirmation';

  const target1 = entry + (riskPerShare * 1.5);
  const target2 = entry + (riskPerShare * 2.2);
  const invalidation = [
    trendPass ? '' : '50DMA remains below 200DMA',
    rsi < 45 ? 'RSI remains weak below 45' : '',
    volume < 100 ? 'Breakout attempts fail on low volume' : '',
    volatility > 40 ? 'Volatility spikes above risk comfort' : ''
  ].filter(Boolean);

  const marketLine = market === 'india' ? 'Market: India (NSE/BSE)' : 'Market: US (NYSE/NASDAQ)';
  const planTitle = `${setupQuality} Setup • ${side}`;
  const invalidationText = invalidation.length ? invalidation.join('; ') : 'Price closes below stop-loss or setup structure breaks.';

  tradePlanOutput.innerHTML = `
    <p><strong>${planTitle}</strong></p>
    <ul>
      <li>${marketLine}</li>
      <li>Confluence: <strong>${passed}/4</strong> factors aligned (Trend, Momentum, Volume, Volatility)</li>
      <li>Entry: <strong>${formatNum(entry)}</strong> | Stop-loss: <strong>${formatNum(stop)}</strong></li>
      <li>Target 1 (1.5R): <strong>${formatNum(target1)}</strong> | Target 2 (2.2R): <strong>${formatNum(target2)}</strong></li>
      <li>Risk per trade: <strong>${formatNum(maxLoss)}</strong> (${riskPct.toFixed(1)}% of capital)</li>
      <li>Suggested quantity: <strong>${qty}</strong> shares</li>
      <li>Invalidation: <strong>${invalidationText}</strong></li>
      <li>Execution note: Enter in 2 tranches and avoid fresh entry if setup quality is ${setupQuality === 'Weak' ? 'weak' : 'not yet confirmed'}.</li>
    </ul>
  `;

  latestTradePlanText = [
    'Generated Trade Plan',
    planTitle,
    marketLine,
    `Confluence: ${passed}/4`,
    `Entry: ${formatNum(entry)} | Stop-loss: ${formatNum(stop)}`,
    `Target 1 (1.5R): ${formatNum(target1)} | Target 2 (2.2R): ${formatNum(target2)}`,
    `Risk per trade: ${formatNum(maxLoss)} (${riskPct.toFixed(1)}% of capital)`,
    `Suggested quantity: ${qty}`,
    `Invalidation: ${invalidationText}`,
    `Execution note: Enter in 2 tranches and avoid fresh entry if setup quality is ${setupQuality === 'Weak' ? 'weak' : 'not yet confirmed'}.`
  ].join('\n');
}

generatePlanBtn?.addEventListener('click', generateTradePlan);
copyPlanBtn?.addEventListener('click', async () => {
  if (!latestTradePlanText) generateTradePlan();
  try {
    await navigator.clipboard.writeText(latestTradePlanText);
    copyPlanBtn.textContent = 'Copied';
    setTimeout(() => {
      copyPlanBtn.textContent = 'Copy Plan';
    }, 1200);
  } catch (_) {
    copyPlanBtn.textContent = 'Copy Failed';
    setTimeout(() => {
      copyPlanBtn.textContent = 'Copy Plan';
    }, 1200);
  }
});

document.querySelectorAll('.walkthrough-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('focus-ring');
    setTimeout(() => {
      target.classList.remove('focus-ring');
    }, 1500);
  });
});

const tourBackdrop = document.getElementById('tour-backdrop');
const startPopupTourBtn = document.getElementById('start-popup-tour-btn');
const tourProgress = document.getElementById('tour-progress');
const tourTitle = document.getElementById('tour-title');
const tourDescription = document.getElementById('tour-description');
const tourPrevBtn = document.getElementById('tour-prev-btn');
const tourNextBtn = document.getElementById('tour-next-btn');
const tourCloseBtn = document.getElementById('tour-close-btn');

const tourSteps = [
  {
    target: 'start-path',
    title: 'Step 1: Start Path',
    description: 'Read this section first. Decide whether you are investing (long-term) or trading (short-term), then stick to one approach per position.'
  },
  {
    target: 'market-context-section',
    title: 'Step 2: Choose Market Context',
    description: 'Pick India or US based on the stocks you follow. For Indian learners, use presets to load common NSE/BSE setups quickly.'
  },
  {
    target: 'simulator-section',
    title: 'Step 3: Read Signal Quality',
    description: 'Move sliders and check Bias, practical notes, and confluence score. Do not trade using one metric alone.'
  },
  {
    target: 'risk-section',
    title: 'Step 4: Set Risk',
    description: 'Enter your capital, risk %, entry, and stop-loss. Position size should come from risk, not from emotion.'
  },
  {
    target: 'tradeplan-section',
    title: 'Step 5: Generate Plan',
    description: 'Click Generate Plan and review entry, targets, invalidation, and quantity. Copy the plan into your journal before taking action.'
  },
  {
    target: 'quiz-section',
    title: 'Step 6: Self Check',
    description: 'Finish checklist and quiz. If setup quality is weak, skip trade and wait for better alignment.'
  }
];

let currentTourStep = 0;

function clearTourFocus() {
  document.querySelectorAll('.focus-ring').forEach((el) => el.classList.remove('focus-ring'));
}

function renderTourStep() {
  const step = tourSteps[currentTourStep];
  if (!step) return;

  tourProgress.textContent = `Step ${currentTourStep + 1}/${tourSteps.length}`;
  tourTitle.textContent = step.title;
  tourDescription.textContent = step.description;

  const target = document.getElementById(step.target);
  if (target) {
    clearTourFocus();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('focus-ring');
  }

  tourPrevBtn.disabled = currentTourStep === 0;
  tourNextBtn.textContent = currentTourStep === tourSteps.length - 1 ? 'Finish' : 'Next';
}

function closeTour() {
  if (!tourBackdrop) return;
  tourBackdrop.style.display = 'none';
  clearTourFocus();
}

startPopupTourBtn?.addEventListener('click', () => {
  if (!tourBackdrop) return;
  currentTourStep = 0;
  tourBackdrop.style.display = 'flex';
  renderTourStep();
});

tourPrevBtn?.addEventListener('click', () => {
  if (currentTourStep > 0) {
    currentTourStep -= 1;
    renderTourStep();
  }
});

tourNextBtn?.addEventListener('click', () => {
  if (currentTourStep >= tourSteps.length - 1) {
    closeTour();
    return;
  }
  currentTourStep += 1;
  renderTourStep();
});

tourCloseBtn?.addEventListener('click', closeTour);
tourBackdrop?.addEventListener('click', (event) => {
  if (event.target === tourBackdrop) closeTour();
});
