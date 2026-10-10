import { format, parseISO } from 'date-fns'

export function toInvoiceDateString(value: string | Date | null): string {
  if (value === null || value === '') {
    return ''
  }

  return typeof value === 'string' ? value : format(value, 'yyyy-MM-dd')
}

export function formatInvoiceDate(value: string, formatString: string): string {
  return format(parseISO(value), formatString)
}
