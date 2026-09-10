import { TimestampType } from '@/types/schema';

export function formatDate(
  dateInput: TimestampType | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale = 'en-KE'
): string {
  if (!dateInput) return 'N/A';

  try {
    let date: Date | null = null;

    if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) {
      date = new Date((dateInput as { seconds: number }).seconds * 1000);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      } else if (typeof dateInput === 'string') {
        // Check if string contains a timestamp like ord_1789043686251_...
        const match = dateInput.match(/(\d{12,14})/);
        if (match) {
          const extractedDate = new Date(Number(match[1]));
          if (!isNaN(extractedDate.getTime())) {
            date = extractedDate;
          }
        }
      }
    }

    if (!date || isNaN(date.getTime())) {
      return 'N/A';
    }

    const formatted = date.toLocaleDateString(
      locale,
      options || {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );

    return formatted === 'Invalid Date' ? 'N/A' : formatted;
  } catch {
    return 'N/A';
  }
}
