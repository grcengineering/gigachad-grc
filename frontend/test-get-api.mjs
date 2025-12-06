import { getSimpleIcon } from 'simple-icons';

console.log('Testing getSimpleIcon API:');

const testSlugs = [
  'github',
  'amazonwebservices',
  'aws',
  'googlecloud',
  'microsoftazure',
  'azure',
  'slack',
  'jira',
  'okta'
];

testSlugs.forEach(slug => {
  const icon = getSimpleIcon(slug);
  console.log(`${slug}: ${icon ? 'EXISTS (' + icon.title + ')' : 'MISSING'}`);
});
