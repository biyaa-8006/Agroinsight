/**
 * AgroInsight — Central API configuration
 *
 * FIX: All API base URLs were hardcoded to http://localhost in three separate
 * files (api.js, login.js, preferences.js). Now defined in one place only.
 *
 * To deploy: change this single line to your production domain.
 * Example: const API_BASE = 'https://agroinsight.example.com/Backend/api';
 */
'use strict';

window.AGRO_API_BASE = (function () {
  // Allow override via meta tag: <meta name="agro-api-base" content="https://...">
  const meta = document.querySelector('meta[name="agro-api-base"]');
  if (meta && meta.content) return meta.content.replace(/\/$/, '');
  // Default for local development
  return 'http://localhost/agroinsight/Backend/api';
})();
