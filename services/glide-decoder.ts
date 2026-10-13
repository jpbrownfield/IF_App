import { GLIDE_WORDS } from './glide-lexicon';

export interface GlidePoint { x: number; y: number }
export type GlideLayout = Record<string, GlidePoint>;

const wordGroups = new Map<string, { word: string; rank: number }[]>();
GLIDE_WORDS.forEach((word, rank) => {
  const key = `${word[0]}${word[word.length - 1]}`;
  const group = wordGroups.get(key) || [];
  group.push({ word, rank });
  wordGroups.set(key, group);
});

function resample(points: GlidePoint[], count = 16): GlidePoint[] {
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    distances.push(distances[index - 1] + Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    ));
  }
  const length = distances[distances.length - 1];
  if (length === 0) return Array.from({ length: count }, () => points[0]);
  const result: GlidePoint[] = [];
  let segment = 1;
  for (let index = 0; index < count; index += 1) {
    const position = length * index / (count - 1);
    while (segment < distances.length - 1 && distances[segment] < position) segment += 1;
    const span = distances[segment] - distances[segment - 1];
    const fraction = span ? (position - distances[segment - 1]) / span : 0;
    result.push({
      x: points[segment - 1].x + fraction * (points[segment].x - points[segment - 1].x),
      y: points[segment - 1].y + fraction * (points[segment].y - points[segment - 1].y),
    });
  }
  return result;
}

function pathLength(points: GlidePoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return length;
}

export function decodeGlide(points: GlidePoint[], letters: string[], layout: GlideLayout): string[] {
  const literal = letters.join('');
  if (points.length < 2 || letters.length < 2) return literal ? [literal] : [];
  const candidates = wordGroups.get(`${letters[0]}${letters[letters.length - 1]}`) || [];
  const trace = resample(points);
  const traceLength = pathLength(points);
  const keyWidth = Math.max(1, Math.abs(layout.q.x - layout.w.x));
  const ranked = candidates.flatMap(({ word, rank }) => {
    const shape = [...word].map(letter => layout[letter]);
    if (shape.some(point => !point)) return [];
    const sample = resample(shape);
    const averageError = Math.sqrt(sample.reduce((sum, point, index) =>
      sum + (point.x - trace[index].x) ** 2 + (point.y - trace[index].y) ** 2, 0) / sample.length) / keyWidth;
    const lengthPenalty = Math.abs(Math.log(Math.max(1, pathLength(shape)) / Math.max(1, traceLength))) * .18;
    return [{ word, score: averageError + lengthPenalty + Math.log1p(rank) * .025 }];
  }).sort((left, right) => left.score - right.score);

  const best = ranked[0];
  const predicted = best && best.score < .85 ? ranked.slice(0, 3).map(item => item.word) : [];
  if (!predicted.length) return [literal];
  if (!predicted.includes(literal)) predicted.splice(2, 1, literal);
  return predicted;
}
