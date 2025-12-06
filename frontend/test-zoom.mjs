const zoomDomains = [
  'zoom.us',
  'zoom.com',
  'us.zoom.us',
];

console.log('Testing Zoom logo domains:\n');

for (const domain of zoomDomains) {
  const url = `https://logo.clearbit.com/${domain}`;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const emoji = response.ok ? '✅' : '❌';
    const pad = domain + ' '.repeat(Math.max(0, 20 - domain.length));
    console.log(`${emoji} ${pad} (${response.status})`);
  } catch (error) {
    const pad = domain + ' '.repeat(Math.max(0, 20 - domain.length));
    console.log(`❌ ${pad} (Error)`);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}
