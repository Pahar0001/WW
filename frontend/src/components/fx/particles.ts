import * as THREE from 'three';

/**
 * Текстура «мягкая светящаяся точка» для любых частиц.
 *
 * Нужна всюду, где используется `pointsMaterial`: БЕЗ карты он рисует
 * квадраты, и брызги водопада или пыль превращаются в рассыпанные бумажки —
 * самый заметный признак дешёвой графики. Генерируется на canvas в рантайме,
 * поэтому не стоит ни файла в репозитории, ни сетевого запроса.
 */
export function makeGlowTexture(
  inner = 'rgba(255,246,224,1)',
  mid = 'rgba(255,214,140,0.42)',
): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.28, mid);
  g.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
