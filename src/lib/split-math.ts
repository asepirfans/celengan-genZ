export interface SplitPerson {
    name: string;
    subtotal: number;
}
export function splitTotal(subtotal: number, taxPercent: number, servicePercent: number): number {
    if (!Number.isSafeInteger(subtotal) || subtotal <= 0 || !Number.isFinite(taxPercent) || !Number.isFinite(servicePercent))
        return 0;
    const basis = 10000 + Math.round(taxPercent * 100) + Math.round(servicePercent * 100);
    return Number((BigInt(subtotal) * BigInt(basis) + BigInt(5000)) / BigInt(10000));
}
export function splitAmounts(subtotal: number, total: number, people: SplitPerson[], mode: 'equal' | 'custom'): number[] {
    if (!people.length || subtotal <= 0)
        return people.map(() => 0);
    if (mode === 'equal') {
        const base = Math.floor(total / people.length);
        return people.map((_, i) => base + (i < total % people.length ? 1 : 0));
    }
    if (people.reduce((sum, p) => sum + BigInt(p.subtotal), BigInt(0)) !== BigInt(subtotal))
        return people.map(() => 0);
    const shares = people.map((person, i) => { const numerator = BigInt(total) * BigInt(person.subtotal); return { i, base: Number(numerator / BigInt(subtotal)), fraction: numerator % BigInt(subtotal) }; });
    const result = shares.map(share => share.base);
    let remainder = total - result.reduce((sum, value) => sum + value, 0);
    const order = [...shares].sort((a, b) => a.fraction === b.fraction ? a.i - b.i : a.fraction > b.fraction ? -1 : 1);
    for (const share of order) {
        if (remainder-- <= 0)
            break;
        result[share.i]++;
    }
    return result;
}
