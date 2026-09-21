// Light clean-up only: collapse stray spacing, capitalise sentence starts and
// close the last sentence, so the voice reads it with natural cadence.
export function polishText(text) {
  const tidy = text
    .trim()
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\s+([,.!?;:])/g, '$1')
    // Only where a space is clearly missing, so "example.com" and "3.5" survive.
    .replace(/([.!?])(?=[A-Z])/g, '$1 ')
    .replace(/,(?=[A-Za-z])/g, ', ')
    .replace(/(^|[.!?]\s+|\n)([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase())
    .trimEnd();
  return tidy && !/[.!?…"'’”)]$/.test(tidy) ? `${tidy}.` : tidy;
}
