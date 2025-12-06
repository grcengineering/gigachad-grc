const testDomains = {
  'IBM Cloud': [
    'ibm.com',
    'cloud.ibm.com',
    'ibmcloud.com',
  ],
  'Zoom': [
    'zoom.us',
    'zoom.com',
  ],
};

console.log('Testing IBM Cloud and Zoom logos:\n');

for (const [service, domains] of Object.entries(testDomains)) {
  console.log(`${service}:`);
  for (const domain of domains) {
    const url = `https://logo.clearbit.com/${domain}`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const emoji = response.ok ? '✅' : '❌';
      const pad = domain + ' '.repeat(Math.max(0, 30 - domain.length));
      console.log(`  ${emoji} ${pad} (${response.status})`);
    } catch (error) {
      const pad = domain + ' '.repeat(Math.max(0, 30 - domain.length));
      console.log(`  ❌ ${pad} (Error)`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log('');
}
