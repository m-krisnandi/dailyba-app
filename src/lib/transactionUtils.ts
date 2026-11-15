import { Transaction } from '@/types/finance';

/**
 * Cleans up raw bank statement/parser notes for elegant display.
 * Strips technical gateway prefixes (e.g. "MANDIRI: Livin Mandiri Merchant:")
 * and masks sensitive account/phone numbers.
 */
export function cleanTransactionNote(note?: string): string {
  if (!note) return '';
  let cleaned = note.trim();

  // Strip technical bank prefixes
  cleaned = cleaned.replace(/^(?:MANDIRI|BCA|JAGO|BBNI|BRI|PAYPAY|LINEPAY|GOPAY|OVO|DANA):\s*/i, '');
  cleaned = cleaned.replace(/^(?:Livin Mandiri Merchant|QR Payment to|Transfer to|Payment to|Merchant|支払い|振込先):\s*/i, '');
  cleaned = cleaned.replace(/^QRIS\s+/i, '');

  // Mask sensitive account numbers (e.g., Rek: 1234567890 -> Rek: ••••7890)
  cleaned = cleaned.replace(/(?:rek(?:ening)?|acc(?:ount)?|no\.?)\s*[:#]?\s*(\d{2,})(\d{4})/gi, '••••$2');

  return cleaned.trim() || note;
}
