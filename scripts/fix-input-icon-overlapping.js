#!/usr/bin/env node

/**
 * Script to fix icon overlapping issues in input fields across the app
 * This script ensures proper padding for inputs with icons
 */

const fs = require('fs');
const path = require('path');

// Files to check and fix
const filesToFix = [
  'src/components/auth/LoginForm.tsx',
  'src/components/auth/RegisterForm.tsx',
  'src/components/onboarding/steps/PersonalInfoStep.tsx',
  'src/components/forms/BankAccountForm.tsx',
  'src/components/forms/AssetForm.tsx',
  'src/components/forms/LiabilityForm.tsx',
  'src/components/forms/GoalForm.tsx',
  'src/components/forms/InsuranceForm.tsx',
  'src/pages/Settings.tsx'
];

// Pattern to find inputs with icons that might have overlapping issues
const patterns = [
  // Input with left icon but no proper padding
  {
    search: /className="input-field theme-input"/g,
    replace: 'className="input-field theme-input"',
    description: 'Basic input field'
  },
  // Input with left icon
  {
    search: /className="input-field pl-10 theme-input"/g,
    replace: 'className="input-field pl-10 theme-input"',
    description: 'Input with left icon'
  },
  // Input with both left and right icons
  {
    search: /className="input-field pl-10 pr-10 theme-input"/g,
    replace: 'className="input-field pl-10 pr-10 theme-input"',
    description: 'Input with both icons'
  }
];

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check for inputs that have icons but might not have proper padding
  const lines = content.split('\n');
  let hasIcons = false;
  let hasInputs = false;

  lines.forEach((line, index) => {
    // Check for icon components
    if (line.includes('<Mail ') || line.includes('<Lock ') || line.includes('<User ') || 
        line.includes('<Calendar ') || line.includes('<Phone ') || line.includes('<Eye ')) {
      hasIcons = true;
    }
    
    // Check for input fields
    if (line.includes('input-field') && line.includes('className=')) {
      hasInputs = true;
      
      // Check if input has proper padding for icons
      const prevLine = lines[index - 1] || '';
      const nextLine = lines[index + 1] || '';
      const contextLines = [prevLine, line, nextLine].join(' ');
      
      // If there's an icon in the context but no proper padding
      if (contextLines.includes('absolute left-3') && !line.includes('pl-10')) {
        console.log(`🔧 Found input that needs left padding in ${filePath}:${index + 1}`);
        lines[index] = line.replace('className="input-field', 'className="input-field pl-10');
        modified = true;
      }
      
      if (contextLines.includes('absolute right-3') && !line.includes('pr-10')) {
        console.log(`🔧 Found input that needs right padding in ${filePath}:${index + 1}`);
        lines[index] = line.replace('className="input-field', 'className="input-field pr-10');
        modified = true;
      }
    }
  });

  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed icon overlapping in: ${filePath}`);
    return true;
  } else if (hasIcons && hasInputs) {
    console.log(`✅ No issues found in: ${filePath}`);
  } else {
    console.log(`ℹ️  No icons or inputs found in: ${filePath}`);
  }

  return false;
}

function main() {
  console.log('🔧 Fixing input icon overlapping issues...\n');

  let totalFixed = 0;

  filesToFix.forEach(filePath => {
    if (fixFile(filePath)) {
      totalFixed++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Files checked: ${filesToFix.length}`);
  console.log(`   Files fixed: ${totalFixed}`);
  
  if (totalFixed > 0) {
    console.log('\n✅ Icon overlapping issues have been fixed!');
    console.log('   The following improvements were made:');
    console.log('   • Added proper left padding (pl-10) for inputs with left icons');
    console.log('   • Added proper right padding (pr-10) for inputs with right icons');
    console.log('   • Ensured icons don\'t overlap with placeholder text');
  } else {
    console.log('\n✅ No icon overlapping issues found!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, main };