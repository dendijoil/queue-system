type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Gabungkan lapisan pengaturan dari yang paling umum ke paling khusus
 * (default sistem → template → tenant → cabang → layanan).
 * Objek digabung per kunci; nilai lain (termasuk array) ditimpa utuh.
 * `undefined` berarti "ikut lapisan di atasnya".
 */
export function mergeSettingLayers(...layers: Array<PlainObject | undefined>): PlainObject {
  const result: PlainObject = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, value] of Object.entries(layer)) {
      if (value === undefined) continue;
      const current = result[key];
      result[key] =
        isPlainObject(current) && isPlainObject(value) ? mergeSettingLayers(current, value) : value;
    }
  }
  return result;
}
