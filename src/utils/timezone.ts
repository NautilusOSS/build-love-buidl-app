// Utility functions for timezone handling

/**
 * Converts a date string to Mountain Time (MST/MDT) and adds 20 hours
 * Automatically handles daylight saving time transitions
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in Mountain Time plus 20 hours
 */
export const convertToMountainTime = (dateString: string): Date => {
  // Create a date object from the date string at midnight
  const date = new Date(dateString + "T00:00:00");
  
  // Get the timezone offset for Mountain Time
  // This will automatically handle MST (UTC-7) vs MDT (UTC-6)
  const mountainTimeZone = "America/Denver";
  
  // Format the date in Mountain Time
  const mountainTimeString = date.toLocaleString("en-US", {
    timeZone: mountainTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // Create a new date object from the Mountain Time string
  const mountainTime = new Date(mountainTimeString);
  
  // Add 20 hours to the Mountain Time
  mountainTime.setHours(mountainTime.getHours() + 20);
  
  return mountainTime;
};

/**
 * Gets the current time in Mountain Time
 * @returns Date object representing current time in Mountain Time
 */
export const getCurrentMountainTime = (): Date => {
  return new Date(new Date().toLocaleString("en-US", {
    timeZone: "America/Denver"
  }));
};

/**
 * Formats a date for display in Mountain Time
 * @param date - Date object to format
 * @returns Formatted date string in Mountain Time
 */
export const formatMountainTime = (date: Date): string => {
  return date.toLocaleString("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}; 