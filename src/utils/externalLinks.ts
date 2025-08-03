/**
 * Utility function to handle external link clicks with proper error handling
 * @param url - The URL to open
 * @param linkName - A descriptive name for the link (for logging)
 * @param fallbackMessage - Optional custom message for fallback alerts
 */
export const handleExternalLink = (
  url: string, 
  linkName: string, 
  fallbackMessage?: string
) => {
  try {
    // Open in new tab with security attributes
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    
    // Check if the window was blocked by popup blocker
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      throw new Error('Popup blocked by browser');
    }
    
    // Log the successful click for analytics
    console.log(`External link clicked: ${linkName} -> ${url}`);
    
  } catch (error) {
    console.error(`Failed to open ${linkName}:`, error);
    
    // Try to copy URL to clipboard as fallback
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        const message = fallbackMessage || `Link copied to clipboard: ${url}`;
        alert(message);
      }).catch(() => {
        const message = fallbackMessage || `Please manually visit: ${url}`;
        alert(message);
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      const message = fallbackMessage || `Please manually visit: ${url}`;
      alert(message);
    }
  }
};

/**
 * Utility function to validate URLs before opening
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is valid
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Utility function to get a safe URL with fallback
 * @param url - The URL to process
 * @param fallbackUrl - Optional fallback URL
 * @returns The validated URL or fallback
 */
export const getSafeUrl = (url: string, fallbackUrl?: string): string => {
  if (isValidUrl(url)) {
    return url;
  }
  
  if (fallbackUrl && isValidUrl(fallbackUrl)) {
    console.warn(`Invalid URL provided: ${url}, using fallback: ${fallbackUrl}`);
    return fallbackUrl;
  }
  
  console.error(`Invalid URL provided: ${url}`);
  return '#';
}; 