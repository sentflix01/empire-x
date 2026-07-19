const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

function parseFrontendUrls() {
  const raw = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
  return raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function normalizeFrontendUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

function getPrimaryFrontendUrl() {
  const urls = parseFrontendUrls();
  if (!urls.length) return DEFAULT_FRONTEND_URL;

  const directUrl = urls.find(value => !value.includes('*'));
  if (directUrl) {
    try {
      return normalizeFrontendUrl(directUrl);
    } catch {
      return DEFAULT_FRONTEND_URL;
    }
  }

  return DEFAULT_FRONTEND_URL;
}

function getFrontendOrigins() {
  return parseFrontendUrls();
}

module.exports = {
  parseFrontendUrls,
  getPrimaryFrontendUrl,
  getFrontendOrigins,
};
