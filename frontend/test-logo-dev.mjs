// Test which integrations have logos available on Logo.dev
const testDomains = [
  { name: 'Google Meet', domain: 'google.com' },
  { name: 'Google Meet Alt', domain: 'meet.google.com' },
  { name: 'IBM Cloud', domain: 'ibm.com' },
  { name: 'Zoom', domain: 'zoom.us' },
  { name: 'Rocket.Chat', domain: 'rocket.chat' },
  { name: 'Apache Superset', domain: 'apache.org' },
  { name: 'Looker', domain: 'looker.com' },
  { name: 'Azure DevOps', domain: 'azure.com' },
  { name: 'BambooHR', domain: 'bamboohr.com' },
  { name: 'Basecamp', domain: 'basecamp.com' },
  { name: 'Microsoft Intune', domain: 'microsoft.com' },
  { name: 'SharePoint', domain: 'microsoft.com' },
  { name: 'Google Drive', domain: 'google.com' },
];

console.log('Testing Logo.dev availability:\n');

for (const { name, domain } of testDomains) {
  const url = `https://img.logo.dev/${domain}?token=pk_X-2mHfp_QEWBehu2D-nrHQ`;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const emoji = response.ok ? '✅' : '❌';
    const pad = name + ' '.repeat(Math.max(0, 25 - name.length));
    console.log(`${emoji} ${pad} → ${domain.padEnd(25)} (${response.status})`);
  } catch (error) {
    const pad = name + ' '.repeat(Math.max(0, 25 - name.length));
    console.log(`❌ ${pad} → ${domain.padEnd(25)} (Error: ${error.message})`);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('\n\nTesting Google Favicon as fallback:\n');

for (const { name, domain } of testDomains) {
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const emoji = response.ok ? '✅' : '❌';
    const pad = name + ' '.repeat(Math.max(0, 25 - name.length));
    console.log(`${emoji} ${pad} → ${domain.padEnd(25)} (${response.status})`);
  } catch (error) {
    const pad = name + ' '.repeat(Math.max(0, 25 - name.length));
    console.log(`❌ ${pad} → ${domain.padEnd(25)} (Error: ${error.message})`);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}
