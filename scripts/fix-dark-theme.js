#!/usr/bin/env node

/**
 * Comprehensive Dark Theme Fix Script
 * 
 * This script systematically updates all components to use the new theme system
 */

const fs = require('fs');
const path = require('path');

// Common replacements for dark theme fixes
const replacements = [
  // Basic text colors
  {
    from: /className="([^"]*?)text-gray-900([^"]*?)"/g,
    to: 'className="$1text-gray-900 dark:text-white$2"'
  },
  {
    from: /className="([^"]*?)text-gray-800([^"]*?)"/g,
    to: 'className="$1text-gray-800 dark:text-gray-100$2"'
  },
  {
    from: /className="([^"]*?)text-gray-700([^"]*?)"/g,
    to: 'className="$1text-gray-700 dark:text-gray-200$2"'
  },
  {
    from: /className="([^"]*?)text-gray-600([^"]*?)"/g,
    to: 'className="$1text-gray-600 dark:text-gray-300$2"'
  },
  {
    from: /className="([^"]*?)text-gray-500([^"]*?)"/g,
    to: 'className="$1text-gray-500 dark:text-gray-400$2"'
  },
  
  // Background colors
  {
    from: /className="([^"]*?)bg-white([^"]*?)"/g,
    to: 'className="$1bg-white dark:bg-gray-800$2"'
  },
  {
    from: /className="([^"]*?)bg-gray-50([^"]*?)"/g,
    to: 'className="$1bg-gray-50 dark:bg-gray-700$2"'
  },
  {
    from: /className="([^"]*?)bg-gray-100([^"]*?)"/g,
    to: 'className="$1bg-gray-100 dark:bg-gray-700$2"'
  },
  
  // Border colors
  {
    from: /className="([^"]*?)border-gray-200([^"]*?)"/g,
    to: 'className="$1border-gray-200 dark:border-gray-600$2"'
  },
  {
    from: /className="([^"]*?)border-gray-300([^"]*?)"/g,
    to: 'className="$1border-gray-300 dark:border-gray-500$2"'
  },
  
  // Hover states
  {
    from: /className="([^"]*?)hover:bg-gray-50([^"]*?)"/g,
    to: 'className="$1hover:bg-gray-50 dark:hover:bg-gray-700$2"'
  },
  {
    from: /className="([^"]*?)hover:bg-gray-100([^"]*?)"/g,
    to: 'className="$1hover:bg-gray-100 dark:hover:bg-gray-600$2"'
  },
  
  // Status colors with better contrast
  {
    from: /className="([^"]*?)text-green-600([^"]*?)"/g,
    to: 'className="$1text-green-600 dark:text-green-400$2"'
  },
  {
    from: /className="([^"]*?)text-red-600([^"]*?)"/g,
    to: 'className="$1text-red-600 dark:text-red-400$2"'
  },
  {
    from: /className="([^"]*?)text-blue-600([^"]*?)"/g,
    to: 'className="$1text-blue-600 dark:text-blue-400$2"'
  },
  {
    from: /className="([^"]*?)text-yellow-600([^"]*?)"/g,
    to: 'className="$1text-yellow-600 dark:text-yellow-400$2"'
  },
  {
    from: /className="([^"]*?)text-purple-600([^"]*?)"/g,
    to: 'className="$1text-purple-600 dark:text-purple-400$2"'
  }
];

// Files to process
const filesToProcess = [
  'src/components/**/*.tsx',
  'src/pages/**/*.tsx',
  'src/components/**/*.ts'
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply all replacements
    replacements.forEach(({ from, to }) => {
      const originalContent = content;
      content = content.replace(from, to);
      if (content !== originalContent) {
        modified = true;
      }
    });
    
    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  let totalUpdated = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        totalUpdated += processDirectory(itemPath);
      } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
        if (processFile(itemPath)) {
          totalUpdated++;
        }
      }
    });
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
  }
  
  return totalUpdated;
}

function main() {
  console.log('🎨 Starting comprehensive dark theme fix...\n');
  
  const startTime = Date.now();
  let totalUpdated = 0;
  
  // Process src directory
  totalUpdated += processDirectory('./src');
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n🎉 Dark theme fix completed!`);
  console.log(`📊 Files updated: ${totalUpdated}`);
  console.log(`⏱️  Duration: ${duration}s`);
  
  if (totalUpdated > 0) {
    console.log('\n💡 Next steps:');
    console.log('1. Test the application in both light and dark modes');
    console.log('2. Check for any remaining theme issues');
    console.log('3. Run npm run build to verify everything compiles');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, processDirectory, replacements };