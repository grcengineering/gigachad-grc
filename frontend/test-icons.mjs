import * as SimpleIcons from 'simple-icons';

console.log('Testing Simple Icons naming:');
console.log('siGithub exists?', !!SimpleIcons.siGithub);
console.log('siAmazonwebservices exists?', !!SimpleIcons.siAmazonwebservices);
console.log('siGooglecloud exists?', !!SimpleIcons.siGooglecloud);
console.log('siMicrosoftazure exists?', !!SimpleIcons.siMicrosoftazure);

console.log('\nAmazon* keys:', Object.keys(SimpleIcons).filter(k => k.toLowerCase().startsWith('siamazon')));
console.log('Google* keys:', Object.keys(SimpleIcons).filter(k => k.toLowerCase().startsWith('sigoogle')).slice(0, 5));

// Test what we're doing in the component
const testSlug = 'amazonwebservices';
const iconKey = `si${testSlug.charAt(0).toUpperCase()}${testSlug.slice(1)}`;
console.log('\nTest conversion:');
console.log('Slug:', testSlug);
console.log('Generated key:', iconKey);
console.log('Exists?', !!SimpleIcons[iconKey]);
