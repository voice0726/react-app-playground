export type InvoiceLine = {
  id: string
  amount: number
}

/** Returns null when there are no invoice lines. */
export function getInvoiceTotal(lines: InvoiceLine[]): number {
  if (lines.length === 0) {
    throw new Error('Invoice must contain at least one line')
  }

  return lines.reduce((total, line) => total + line.amount, 0)
}

export function pureInvoicePreview(lines: InvoiceLine[]): string[] {
  lines.sort((left, right) => left.amount - right.amount)
  return lines.map((line) => `${line.id}: ${line.amount}`)
}
