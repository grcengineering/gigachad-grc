const cloudDomains = {
  'AWS': [
    'aws.amazon.com',
    'amazon.com',
    'aws.com',
  ],
  'GCP': [
    'cloud.google.com',
    'google.com',
    'gcp.google.com',
  ],
  'Azure': [
    'azure.microsoft.com',
    'microsoft.com',
    'azure.com',
  ],
};

console.log('Testing major cloud provider logos:\n');

for (const [provider, domains] of Object.entries(cloudDomains)) {
  console.log(`${provider}:`);
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
