import * as SimpleIcons from 'simple-icons';

const allKeys = Object.keys(SimpleIcons);
console.log('Total icons:', allKeys.length);
console.log('\nAWS/Amazon related:');
console.log(allKeys.filter(k => k.toLowerCase().includes('amazon') || k.toLowerCase().includes('aws')));

console.log('\nMicrosoft Azure related:');
console.log(allKeys.filter(k => k.toLowerCase().includes('azure')));

console.log('\nGoogle Cloud related:');
console.log(allKeys.filter(k => k.toLowerCase().includes('googlecloud')));

console.log('\nFirst 20 icon keys:');
console.log(allKeys.slice(0, 20));
