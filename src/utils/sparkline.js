/**
 * Lightweight sparkline renderer — SVG path generator for mini CO2 previews in device cards.
 */

export function buildSparklinePath(values, width = 80, height = 28) {
  if (!values || values.length < 2) return '';
  const valid = values.filter((v) => isFinite(v));
  if (valid.length < 2) return '';

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;

  const pts = valid.map((v, i) => {
    const x = (i / (valid.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M${pts.join('L')}`;
}

export function sparklineColor(avgValue) {
  if (avgValue === null || avgValue === undefined) return '#94a3b8';
  if (avgValue < 800)  return '#10b981';
  if (avgValue <= 1500) return '#f59e0b';
  return '#ef4444';
}
