import * as SimpleIcons from 'simple-icons';

const currentMappings = {
  aws: 'amazonwebservices',
  gcp: 'googlecloud',
  azure: 'microsoftazure',
  github: 'github',
  slack: 'slack',
  jira: 'jira',
  okta: 'okta',
  notion: 'notion',
  datadog: 'datadog',
  grafana: 'grafana',
};

const allKeys = Object.keys(SimpleIcons).map(k => k.toLowerCase());

console.log('Checking current mappings:\n');
Object.entries(currentMappings).forEach(([key, slug]) => {
  const targetKey = `si${slug}`.toLowerCase();
  const exists = allKeys.includes(targetKey);
  console.log(`${key} -> ${slug}: ${exists ? '✅' : '❌'}`);

  if (!exists) {
    // Try to find similar
    const similar = allKeys.filter(k => k.includes(slug.toLowerCase().slice(0, 5))).slice(0, 3);
    if (similar.length > 0) {
      console.log(`  Similar: ${similar.map(s => s.replace('si', '')).join(', ')}`);
    }
  }
});

console.log('\n\nSearching for AWS/Amazon icons:');
console.log(Object.keys(SimpleIcons).filter(k => k.toLowerCase().includes('aws') || k.toLowerCase().includes('amazon')));

console.log('\nSearching for Azure icons:');
console.log(Object.keys(SimpleIcons).filter(k => k.toLowerCase().includes('azure')));

console.log('\nSearching for Slack icons:');
console.log(Object.keys(SimpleIcons).filter(k => k.toLowerCase().includes('slack')));
