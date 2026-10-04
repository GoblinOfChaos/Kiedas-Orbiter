const defaultCollator = new Intl.Collator();
const numericCollator = new Intl.Collator(undefined, { numeric: true });
const baseCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

const text = (value) => String(value ?? '');

export const compareText = (a, b) => defaultCollator.compare(text(a), text(b));
export const compareTextNumeric = (a, b) => numericCollator.compare(text(a), text(b));
export const compareTextBase = (a, b) => baseCollator.compare(text(a), text(b));
