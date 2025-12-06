const failedIntegrations = {
  ibm_cloud: 'cloud.ibm.com',
  gitlab: 'about.gitlab.com',
  ibm_maas360: 'maas360.com',
  google_meet: 'google.com',
  drata: 'drata.ai',
  looker: 'google.com',
  segment: 'twilio.com',
  justworks: 'justworks.io',
  coda: 'coda.com',
};

console.log('Testing fixed domain mappings:\n');

for (const [key, domain] of Object.entries(failedIntegrations)) {
  const url = `https://logo.clearbit.com/${domain}`;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const emoji = response.ok ? '✅' : '❌';
    const pad1 = key + ' '.repeat(Math.max(0, 20 - key.length));
    const pad2 = domain + ' '.repeat(Math.max(0, 30 - domain.length));
    console.log(`${emoji} ${pad1} → ${pad2} (${response.status})`);
  } catch (error) {
    const pad1 = key + ' '.repeat(Math.max(0, 20 - key.length));
    const pad2 = domain + ' '.repeat(Math.max(0, 30 - domain.length));
    console.log(`❌ ${pad1} → ${pad2} (Error: ${error.message})`);
  }

  // Rate limit
  await new Promise(resolve => setTimeout(resolve, 100));
}
