#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Comprehensive dark theme fixes
const fixes = [
  // Form input consistency fixes
  {
    pattern: /className="([^"]*\b(?:input-field|w-full px-3 py-2 border border-gray-300)[^"]*)"(?![^>]*theme-input)/g,
    replacement: 'className="$1 theme-input"',
    description: 'Fix form input classes'
  },
  
  // Background color fixes for colored sections
  {
    pattern: /bg-blue-50(?!\s+dark:)/g,
    replacement: 'bg-blue-50 dark:bg-blue-900/20',
    description: 'Fix blue backgrounds'
  },
  {
    pattern: /bg-green-50(?!\s+dark:)/g,
    replacement: 'bg-green-50 dark:bg-green-900/20',
    description: 'Fix green backgrounds'
  },
  {
    pattern: /bg-yellow-50(?!\s+dark:)/g,
    replacement: 'bg-yellow-50 dark:bg-yellow-900/20',
    description: 'Fix yellow backgrounds'
  },
  {
    pattern: /bg-red-50(?!\s+dark:)/g,
    replacement: 'bg-red-50 dark:bg-red-900/20',
    description: 'Fix red backgrounds'
  },
  {
    pattern: /bg-purple-50(?!\s+dark:)/g,
    replacement: 'bg-purple-50 dark:bg-purple-900/20',
    description: 'Fix purple backgrounds'
  },
  {
    pattern: /bg-indigo-50(?!\s+dark:)/g,
    replacement: 'bg-indigo-50 dark:bg-indigo-900/20',
    description: 'Fix indigo backgrounds'
  },
  {
    pattern: /bg-orange-50(?!\s+dark:)/g,
    replacement: 'bg-orange-50 dark:bg-orange-900/20',
    description: 'Fix orange backgrounds'
  },
  
  // Border color fixes for colored sections
  {
    pattern: /border-blue-200(?!\s+dark:)/g,
    replacement: 'border-blue-200 dark:border-blue-700',
    description: 'Fix blue borders'
  },
  {
    pattern: /border-green-200(?!\s+dark:)/g,
    replacement: 'border-green-200 dark:border-green-700',
    description: 'Fix green borders'
  },
  {
    pattern: /border-yellow-200(?!\s+dark:)/g,
    replacement: 'border-yellow-200 dark:border-yellow-700',
    description: 'Fix yellow borders'
  },
  {
    pattern: /border-red-200(?!\s+dark:)/g,
    replacement: 'border-red-200 dark:border-red-700',
    description: 'Fix red borders'
  },
  {
    pattern: /border-purple-200(?!\s+dark:)/g,
    replacement: 'border-purple-200 dark:border-purple-700',
    description: 'Fix purple borders'
  },
  {
    pattern: /border-orange-200(?!\s+dark:)/g,
    replacement: 'border-orange-200 dark:border-orange-700',
    description: 'Fix orange borders'
  },
  
  // Text color fixes for colored sections
  {
    pattern: /text-blue-800(?!\s+dark:)/g,
    replacement: 'text-blue-800 dark:text-blue-200',
    description: 'Fix blue text'
  },
  {
    pattern: /text-green-800(?!\s+dark:)/g,
    replacement: 'text-green-800 dark:text-green-200',
    description: 'Fix green text'
  },
  {
    pattern: /text-yellow-800(?!\s+dark:)/g,
    replacement: 'text-yellow-800 dark:text-yellow-200',
    description: 'Fix yellow text'
  },
  {
    pattern: /text-red-800(?!\s+dark:)/g,
    replacement: 'text-red-800 dark:text-red-200',
    description: 'Fix red text'
  },
  {
    pattern: /text-purple-800(?!\s+dark:)/g,
    replacement: 'text-purple-800 dark:text-purple-200',
    description: 'Fix purple text'
  },
  {
    pattern: /text-orange-800(?!\s+dark:)/g,
    replacement: 'text-orange-800 dark:text-orange-200',
    description: 'Fix orange text'
  },
  
  // Secondary text colors
  {
    pattern: /text-blue-700(?!\s+dark:)/g,
    replacement: 'text-blue-700 dark:text-blue-300',
    description: 'Fix blue secondary text'
  },
  {
    pattern: /text-green-700(?!\s+dark:)/g,
    replacement: 'text-green-700 dark:text-green-300',
    description: 'Fix green secondary text'
  },
  {
    pattern: /text-yellow-700(?!\s+dark:)/g,
    replacement: 'text-yellow-700 dark:text-yellow-300',
    description: 'Fix yellow secondary text'
  },
  {
    pattern: /text-red-700(?!\s+dark:)/g,
    replacement: 'text-red-700 dark:text-red-300',
    description: 'Fix red secondary text'
  },
  
  // Progress bar fixes
  {
    pattern: /bg-gray-200(?=.*rounded-full.*h-)/g,
    replacement: 'bg-gray-200 dark:bg-gray-700',
    description: 'Fix progress bar background'
  },
  
  // Form field consistency
  {
    pattern: /className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/g,
    replacement: 'className={theme.input}',
    description: 'Replace hardcoded input styles with theme classes'
  },
  
  // Select field consistency
  {
    pattern: /className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"/g,
    replacement: 'className={theme.select}',
    description: 'Replace hardcoded select styles with theme classes'
  }
];

// File extensions to process
const extensions = ['.tsx', '.ts', '.jsx', '.js'];

// Directories to process
const directories = [
  'src/components',
  'src/pages',
  'src/hooks'
];

function shouldProcessFile(filePath) {
  return extensions.some(ext => filePath.endsWith(ext));
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fixes.forEach(fix => {
      const originalContent = content;
      content = content.replace(fix.pattern, fix.replacement);
      if (content !== originalContent) {
        modified = true;
        console.log(`✅ Applied fix: ${fix.description} in ${filePath}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory not found: ${dirPath}`);
    return { processed: 0, modified: 0 };
  }
  
  let processed = 0;
  let modified = 0;
  
  function walkDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        walkDirectory(itemPath);
      } else if (shouldProcessFile(itemPath)) {
        processed++;
        if (processFile(itemPath)) {
          modified++;
        }
      }
    });
  }
  
  walkDirectory(dirPath);
  return { processed, modified };
}

function main() {
  console.log('🎨 Starting comprehensive dark theme fixes...\n');
  
  let totalProcessed = 0;
  let totalModified = 0;
  
  directories.forEach(dir => {
    console.log(`📁 Processing directory: ${dir}`);
    const result = processDirectory(dir);
    totalProcessed += result.processed;
    totalModified += result.modified;
    console.log(`   Processed: ${result.processed} files, Modified: ${result.modified} files\n`);
  });
  
  console.log('🎉 Dark theme fixes completed!');
  console.log(`📊 Summary: ${totalModified}/${totalProcessed} files modified`);
  
  if (totalModified > 0) {
    console.log('\n🔄 Please restart your development server to see the changes.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixes, processFile, processDirectory };