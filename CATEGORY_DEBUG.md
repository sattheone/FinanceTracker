# Category Change Debug Guide

## Issue
After "Clean All" and "Sync Defaults", categories display correctly but changing a transaction's category doesn't work.

## Root Cause Investigation

The likely issue is that the automatic migration created categories with IDs that might not match what transactions are expecting.

## Quick Debug Steps

### 1. Check Browser Console
Open browser console (F12) and check for errors when changing category.

### 2. Check Firestore Categories
Go to: https://console.firebase.google.com/project/financetracker-b00a6/firestore
- Open `categories` collection  
- Verify document IDs match the expected format (e.g., 'food', 'transport', not random IDs)

### 3. Check Transaction
- Pick a transaction
- Note its current `category` field value
- Try to change it
- Check if the value actually updates in Firestore

## Expected Behavior
- Categories should have preset IDs like: `food`, `transport`, `bills`, etc.
- Subcategories should have IDs like: `groceries`, `restaurants`, `fuel`, etc.
- Transactions should reference these IDs

## If IDs Don't Match
The migration used `addCategoryWithId` which should preserve IDs, but verify:
1. All default categories have their correct IDs
2. No duplicate documents
3. Transactions can successfully update their category field

## Test Transaction Update
In browser console:
```javascript
// Get DataContext
const categories = /* from state */;
console.log('Categories:', categories.map(c => ({ id: c.id, name: c.name })));

// Try updating a transaction
// Check network tab for Firebase write operations
```
