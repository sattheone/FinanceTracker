#!/usr/bin/env node

/**
 * Data Sanitization Script
 * 
 * This script helps identify and replace personal information in the codebase
 * Run this before committing to ensure no personal data is exposed
 */

const fs = require('fs');
const path = require('path');

// Personal data patterns to look for
const personalDataPatterns = [
  // Names
  /Satheesh/gi,
  /Sowmiya/gi,
  /Vidhuna/gi,
  /Aadhya/gi,
  
  // Specific amounts that might be personal
  /230857/g,
  /223857/g,
  /3000000/g,
  /2269000/g,
  /1783000/g,
  
  // Email patterns (except demo)
  /[a-zA-Z0-9._%+-]+@(?!example\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers (Indian format)
  /(\+91|91)?[6-9]\d{9}/g,
];

// Replacement suggestions
const replacements = {
  'Satheesh': 'John Doe',
  'Sowmiya': 'Jane Doe',
  'Vidhuna': 'Child One',
  'Aadhya': 'Child Two',
  '230857': '100000',
  '223857': '95000',
  '3000000': '1500000',
  '2269000': '850000',
  '1783000': '650000',
};

// Files to check (add more as needed)
const filesToCheck = [
  'src/data/initialData.ts',
  'src/utils/demoData.ts',
  'README.md',
  'src/components/**/*.tsx',
  'src/pages/**/*.tsx',
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    personalDataPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          pattern: pattern.toString(),
          matches: matches,
          file: filePath
        });
      }
    });
    
    return issues;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function scanDirectory(dirPath, extensions = ['.ts', '.tsx', '.js', '.jsx', '.md']) {
  const issues = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        issues.push(...scanDirectory(itemPath, extensions));
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        issues.push(...scanFile(itemPath));
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return issues;
}

function main() {
  console.log('🔍 Scanning for personal data...\n');
  
  const issues = scanDirectory('./src');
  
  if (issues.length === 0) {
    console.log('✅ No personal data patterns found!');
    return;
  }
  
  console.log(`⚠️  Found ${issues.length} potential personal data issues:\n`);
  
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. File: ${issue.file}`);
    console.log(`   Pattern: ${issue.pattern}`);
    console.log(`   Matches: ${issue.matches.join(', ')}`);
    console.log('');
  });
  
  console.log('📝 Suggested actions:');
  console.log('1. Review each match to confirm if it contains personal data');
  console.log('2. Replace personal data with generic placeholders');
  console.log('3. Use the replacements object in this script as a guide');
  console.log('4. Re-run this script to verify all issues are resolved');
  console.log('\n💡 Consider adding sensitive patterns to .gitignore');
}

if (require.main === module) {
  main();
}

module.exports = { scanFile, scanDirectory, personalDataPatterns, replacements };