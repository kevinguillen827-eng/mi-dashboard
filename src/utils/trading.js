// ------------------------------------------------------------------
// Funciones puras de cálculo financiero para el dashboard.
// ------------------------------------------------------------------

export function calcResultado(o) {
  const dir = o.tipo === "Compra" ? 1 : -1;
  return (Number(o.precioSalida) - Number(o.precioEntrada)) * Number(o.cantidad) * dir - Number(o.comision || 0);
}

export function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

/** Calcula el conjunto completo de métricas usadas en el dashboard. */
export function computeMetrics(operations) {
  const withPnl = operations.map((o) => ({ ...o, pnl: calcResultado(o) }));
  const sorted = withPnl.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const total = withPnl.length;
  const balance = withPnl.reduce((a, o) => a + o.pnl, 0);
  const wins = withPnl.filter((o) => o.pnl > 0);
  const losses = withPnl.filter((o) => o.pnl < 0);
  const winRate = total ? (wins.length / total) * 100 : 0;

  const grossProfit = wins.reduce((a, o) => a + o.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, o) => a + o.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = total ? (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss : 0;

  // Curva de equity y drawdown máximo
  let cum = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const equityCurve = sorted.map((o) => {
    cum += o.pnl;
    peak = Math.max(peak, cum);
    const dd = peak - cum;
    maxDrawdown = Math.max(maxDrawdown, dd);
    return { fecha: o.fecha, equity: cum };
  });

  // Rachas (streaks)
  let curStreak = 0, curStreakType = null, bestWinStreak = 0, worstLossStreak = 0;
  sorted.forEach((o) => {
    const type = o.pnl >= 0 ? "win" : "loss";
    if (type === curStreakType) curStreak += 1;
    else { curStreak = 1; curStreakType = type; }
    if (type === "win") bestWinStreak = Math.max(bestWinStreak, curStreak);
    else worstLossStreak = Math.max(worstLossStreak, curStreak);
  });

  // Agrupaciones
  const byActivo = groupSum(withPnl, "activo");
  const byEstrategia = groupSum(withPnl, "estrategia");
  const byTipo = groupSum(withPnl, "tipo");

  const now = new Date();
  const monthPnl = withPnl
    .filter((o) => {
      const d = new Date(o.fecha + "T00:00:00");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((a, o) => a + o.pnl, 0);

  const weekPnl = withPnl
    .filter((o) => {
      const d = new Date(o.fecha + "T00:00:00");
      const diffDays = (now - d) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    })
    .reduce((a, o) => a + o.pnl, 0);

  return {
    total, balance, winRate, wins: wins.length, losses: losses.length,
    grossProfit, grossLoss, profitFactor, avgWin, avgLoss, expectancy,
    equityCurve, maxDrawdown, bestWinStreak, worstLossStreak,
    byActivo, byEstrategia, byTipo, monthPnl, weekPnl,
    bestTrade: withPnl.reduce((best, o) => (o.pnl > (best?.pnl ?? -Infinity) ? o : best), null),
    worstTrade: withPnl.reduce((worst, o) => (o.pnl < (worst?.pnl ?? Infinity) ? o : worst), null),
  };
}

function groupSum(withPnl, key) {
  const map = {};
  withPnl.forEach((o) => {
    const k = o[key] || "Sin definir";
    if (!map[k]) map[k] = { key: k, pnl: 0, count: 0, wins: 0 };
    map[k].pnl += o.pnl;
    map[k].count += 1;
    if (o.pnl > 0) map[k].wins += 1;
  });
  return Object.values(map).sort((a, b) => b.pnl - a.pnl);
}
