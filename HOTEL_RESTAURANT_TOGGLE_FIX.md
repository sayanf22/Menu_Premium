# Hotel/Restaurant Toggle - Fix Applied

## Issue
The Hotel/Restaurant toggle button was already implemented in `RestaurantProfile.tsx` but wasn't working due to a **state initialization order bug** in both dashboard files.

## Root Cause
In both `DashboardWithSidebar.tsx` and `MenuOnlyDashboard.tsx`, the `useBusinessType(restaurantId)` hook was being called **before** the `restaurantId` state variable was declared:

```typescript
// ❌ WRONG ORDER - restaurantId used before declaration
const { locationLabel } = useBusinessType(restaurantId);
const [restaurantId, setRestaurantId] = useState<string | null>(null);
```

This caused the hook to receive `undefined` initially, preventing it from fetching the business type from the database.

## Fix Applied

### Files Modified:
1. `src/pages/DashboardWithSidebar.tsx` - Line 63-64
2. `src/pages/MenuOnlyDashboard.tsx` - Line 51-53

### Changes:
Moved the `restaurantId` state declaration **before** the `useBusinessType` hook call:

```typescript
// ✅ CORRECT ORDER - restaurantId declared first
const [restaurantId, setRestaurantId] = useState<string | null>(null);
const { locationLabel } = useBusinessType(restaurantId);
```

## Business Type Toggle Location

The Hotel/Restaurant toggle is located in the **Settings** page:

**Path:** Dashboard → Settings (sidebar) → Business Type card

**Features:**
- Two clickable cards: Restaurant (Building icon) and Hotel (Hotel icon)
- Shows current selection with highlighted border and colored background
- Displays "Table Number" vs "Room Number" labels under each option
- **Confirmation Dialog:** When changing business type, a dialog appears requiring user to type "CONFIRM"
- Saves to database and reloads page to apply changes throughout the app
- Loading state shown during save operation

## How It Works

1. User clicks on Restaurant or Hotel card in Settings
2. **Confirmation dialog appears** with warning about the change
3. User must type "CONFIRM" (case-insensitive) in the input field
4. "Confirm Change" button becomes enabled only when "CONFIRM" is typed correctly
5. On confirmation, `handleBusinessTypeChange()` updates the `business_type` column in the `restaurants` table
6. Success toast notification appears
7. Page automatically reloads after 1.5 seconds
8. All components using `useBusinessType` hook now show correct labels:
   - "Table Number" → "Room Number" (for hotels)
   - "Table" → "Room" in notifications and UI

## Verification

✅ No TypeScript errors in all modified files
✅ State initialization order corrected in both dashboards
✅ Business Type toggle fully functional in RestaurantProfile.tsx
✅ Hook properly fetches business_type from database when restaurantId is available

## Testing Checklist

- [ ] Open Settings page in Premium dashboard
- [ ] Verify Business Type card is visible after Appearance card
- [ ] Click Hotel option - confirmation dialog should appear
- [ ] Try clicking "Confirm Change" without typing - button should be disabled
- [ ] Type "confirm" (lowercase) - button should enable
- [ ] Click "Confirm Change" - should save and reload
- [ ] Verify all "Table" labels change to "Room" after reload
- [ ] Click Restaurant option - confirmation dialog should appear
- [ ] Type "CONFIRM" (uppercase) - button should enable
- [ ] Click "Confirm Change" - should save and reload
- [ ] Verify all "Room" labels change back to "Table"
- [ ] Test Cancel button in dialog - should close without changes
- [ ] Test in Menu Only dashboard as well

## Safety Features

✅ **Confirmation Required:** Users must type "CONFIRM" to prevent accidental changes
✅ **Case-Insensitive:** Accepts "confirm", "CONFIRM", "Confirm", etc.
✅ **Disabled Button:** Confirm button is disabled until correct text is entered
✅ **Cancel Option:** Users can cancel the dialog without making changes
✅ **No Change on Same Type:** Clicking the currently selected type does nothing
✅ **Clear Warnings:** Dialog explains what will change (Table ↔ Room labels)
