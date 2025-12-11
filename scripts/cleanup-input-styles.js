#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Clean up hardcoded input styles
const cleanupRules = [
  // Remove duplicate theme-input classes and hardcoded styles
  {
    pattern: /className="([^"]*?)w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500([^"]*?)theme-input([^"]*)"/g,
    replacement: 'className="$1theme-input$3"',
    description: 'Remove duplicate input styles'
  },
  
  // Clean up any remaining hardcoded input styles
  {
    pattern: /className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/g,
    replacement: 'className={theme.input}',
    description: 'Replace hardcoded input styles with theme'
  },
  
  // Clean up select styles
  {
    pattern: /className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"/g,
    replacement: 'className={theme.select}',
    description: 'Replace hardcoded select styles with theme'
  },
  
  // Fix duplicate dark classes
  {
    pattern: /dark:bg-gray-700 dark:bg-gray-700/g,
    replacement: 'dark:bg-gray-700',
    description: 'Remove duplicate dark classes'
  },
  
  // Fix duplicate dark classes for other colors
  {
    pattern: /dark:bg-gray-800 dark:bg-gray-800/g,
    replacement: 'dark:bg-gray-800',
    description: 'Remove duplicate dark gray-800 classes'
  },
  
  // Fix progress bar colors that are too light
  {
    pattern: /bg-blue-50 dark:bg-blue-900\/200/g,
    replacement: 'bg-blue-500',
    description: 'Fix light blue progress bars'
  },
  
  {
    pattern: /bg-green-50 dark:bg-green-900\/200/g,
    replacement: 'bg-green-500',
    description: 'Fix light green progress bars'
  },
  
  {
    pattern: /bg-red-50 dark:bg-red-900\/200/g,
    replacement: 'bg-red-500',
    description: 'Fix light red progress bars'
  },
  
  // Clean up extra spaces in class names
  {
    pattern: /className="([^"]*?)\s+([^"]*?)"/g,
    replacement: (match, p1, p2) => {
      const cleaned = `${p1} ${p2}`.replace(/\s+/g, ' ').trim();
      return `className="${cleaned}"`;
    },
    description: 'Clean up extra spaces in class names'
  }
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    cleanupRules.forEach(rule => {
      const originalContent = content;
      if (typeof rule.replacement === 'function') {
        content = content.replace(rule.pattern, rule.replacement);
      } else {
        content = content.replace(rule.pattern, rule.replacement);
      }
      if (content !== originalContent) {
        modified = true;
        console.log(`✅ Applied cleanup: ${rule.description} in ${filePath}`);
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
      } else if (itemPath.endsWith('.tsx') || itemPath.endsWith('.ts')) {
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
  console.log('🧹 Cleaning up input styles...\n');
  
  const directories = ['src/components', 'src/pages'];
  let totalProcessed = 0;
  let totalModified = 0;
  
  directories.forEach(dir => {
    console.log(`📁 Processing directory: ${dir}`);
    const result = processDirectory(dir);
    totalProcessed += result.processed;
    totalModified += result.modified;
    console.log(`   Processed: ${result.processed} files, Modified: ${result.modified} files\n`);
  });
  
  console.log('🎉 Cleanup completed!');
  console.log(`📊 Summary: ${totalModified}/${totalProcessed} files modified`);
}

if (require.main === module) {
  main();
}

module.exports = { processFile, processDirectory };