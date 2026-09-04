const fs = require('fs');
const path = require('path');
const https = require('https');

const USERNAME = 'umeshpandeysh';
const TOKEN = process.env.GITHUB_TOKEN;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'NodeJS-Stats-Generator',
        ...(TOKEN ? { Authorization: `token ${TOKEN}` } : {})
      }
    };
    https.get(url, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

const LANG_COLORS = {
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  TypeScript: '#3178c6',
  'Jupyter Notebook': '#DA5B0B',
  HTML: '#e34c26',
  CSS: '#563d7c',
  'C++': '#f34b7d',
  C: '#555555',
  Shell: '#89e051',
  PowerShell: '#012456'
};

async function main() {
  console.log(`Fetching profile stats for ${USERNAME}...`);
  const user = await fetchJson(`https://api.github.com/users/${USERNAME}`);
  const repos = await fetchJson(`https://api.github.com/users/${USERNAME}/repos?per_page=100`);

  let totalStars = 0;
  let totalForks = 0;
  let langBytes = {};

  if (Array.isArray(repos)) {
    for (const r of repos) {
      if (r.fork) continue;
      totalStars += r.stargazers_count || 0;
      totalForks += r.forks_count || 0;

      if (r.languages_url) {
        try {
          const lData = await fetchJson(r.languages_url);
          for (const [lang, bytes] of Object.entries(lData)) {
            langBytes[lang] = (langBytes[lang] || 0) + bytes;
          }
        } catch (e) {
          if (r.language) {
            langBytes[r.language] = (langBytes[r.language] || 0) + 1000;
          }
        }
      }
    }
  }

  // Ensure output directory exists
  const outDir = path.join(__dirname, '../../profile');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // --- 1. GENERATE STATS SVG ---
  const statsSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="450" height="195" viewBox="0 0 450 195" fill="none">
  <style>
    .header { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: #7aa2f7; }
    .stat-label { font: 400 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: #a9b1d6; }
    .stat-value { font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: #7dcfff; }
    .icon { fill: #bb9af7; }
    .bg { fill: #1a1b26; stroke: #24283b; stroke-width: 1px; rx: 6px; }
  </style>
  <rect width="450" height="195" class="bg"/>
  <text x="25" y="35" class="header">Umesh Pandey's GitHub Stats</text>
  
  <g transform="translate(25, 55)">
    <!-- Total Stars -->
    <g transform="translate(0, 0)">
      <path class="icon" d="M8 0L10.472 5.008L16 5.816L12 9.712L12.944 15.24L8 12.64L3.056 15.24L4 9.712L0 5.816L5.528 5.008L8 0Z" transform="scale(0.95)"/>
      <text x="25" y="12" class="stat-label">Total Stars Earned:</text>
      <text x="220" y="12" class="stat-value">${totalStars}</text>
    </g>
    
    <!-- Public Repositories -->
    <g transform="translate(0, 28)">
      <path class="icon" d="M4 1.75C4 .784 4.784 0 5.75 0h6.5c.966 0 1.75.784 1.75 1.75v12.5c0 .414-.336.75-.75.75H4.75a.75.75 0 0 1-.75-.75V1.75zm1.75-.25a.25.25 0 0 0-.25.25v11h8v-11a.25.25 0 0 0-.25-.25h-7.5z"/>
      <text x="25" y="12" class="stat-label">Public Repositories:</text>
      <text x="220" y="12" class="stat-value">${user.public_repos || 8}</text>
    </g>

    <!-- Total Forks -->
    <g transform="translate(0, 56)">
      <path class="icon" d="M5 3.25a1.75 1.75 0 1 1 3.5 0 1.75 1.75 0 0 1-3.5 0zm1.75-3a3.25 3.25 0 0 0-3.25 3.25c0 1.28.742 2.387 1.812 2.909a.75.75 0 0 1 .438.681v2.18c0 .966.784 1.75 1.75 1.75h.5c.966 0 1.75-.784 1.75-1.75v-2.18a.75.75 0 0 1 .438-.681A3.25 3.25 0 0 0 11.75.25a3.25 3.25 0 0 0-5 0z"/>
      <text x="25" y="12" class="stat-label">Total Forks:</text>
      <text x="220" y="12" class="stat-value">${totalForks}</text>
    </g>

    <!-- Followers -->
    <g transform="translate(0, 84)">
      <path class="icon" d="M10.5 5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zm1.5 0a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm-10.5 10c0-2.21 3.582-4 8-4s8 1.79 8 4v.5a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5v-.5z"/>
      <text x="25" y="12" class="stat-label">Followers:</text>
      <text x="220" y="12" class="stat-value">${user.followers || 0}</text>
    </g>
  </g>
</svg>
`.trim();

  fs.writeFileSync(path.join(outDir, 'stats.svg'), statsSvg, 'utf-8');
  console.log('Saved profile/stats.svg');

  // --- 2. GENERATE TOP LANGUAGES SVG ---
  const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0) || 1;
  const sortedLangs = Object.entries(langBytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let barX = 25;
  const barWidthTotal = 400;
  let barSegments = '';
  let langListSvg = '';

  sortedLangs.forEach(([lang, bytes], idx) => {
    const pct = ((bytes / totalBytes) * 100).toFixed(1);
    const segW = Math.max(Math.round((bytes / totalBytes) * barWidthTotal), 4);
    const color = LANG_COLORS[lang] || '#7aa2f7';

    barSegments += `<rect x="${barX}" y="55" width="${segW}" height="8" fill="${color}" ${idx === 0 ? 'rx="3"' : ''}/>`;
    barX += segW;

    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const xPos = 25 + col * 200;
    const yPos = 85 + row * 25;

    langListSvg += `
      <g transform="translate(${xPos}, ${yPos})">
        <circle cx="5" cy="5" r="5" fill="${color}"/>
        <text x="16" y="9" class="stat-label">${lang}</text>
        <text x="140" y="9" class="stat-value">${pct}%</text>
      </g>
    `;
  });

  const topLangsSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="450" height="195" viewBox="0 0 450 195" fill="none">
  <style>
    .header { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: #7aa2f7; }
    .stat-label { font: 400 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: #a9b1d6; }
    .stat-value { font: 600 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: #7dcfff; }
    .bg { fill: #1a1b26; stroke: #24283b; stroke-width: 1px; rx: 6px; }
  </style>
  <rect width="450" height="195" class="bg"/>
  <text x="25" y="35" class="header">Most Used Languages</text>
  
  <!-- Progress Bar -->
  <g>
    <rect x="25" y="55" width="${barWidthTotal}" height="8" fill="#24283b" rx="4"/>
    ${barSegments}
  </g>

  <!-- Language List -->
  <g>
    ${langListSvg}
  </g>
</svg>
`.trim();

  fs.writeFileSync(path.join(outDir, 'top-languages.svg'), topLangsSvg, 'utf-8');
  console.log('Saved profile/top-languages.svg');
}

main().catch(err => {
  console.error('Error generating stats:', err);
  process.exit(1);
});
