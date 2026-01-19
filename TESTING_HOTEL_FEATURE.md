# Testing the Hotel/Restaurant Toggle Feature

## Step-by-Step Testing Guide

### Step 1: Start the Development Server
```bash
npm run dev
```

### Step 2: Login to Your Dashboard
1. Go to `http://localhost:8080` (or your dev server URL)
2. Login with your credentials:
   - Email: `sayanf22@gmail.com`
   - Password: `admin123`

### Step 3: Navigate to Settings
1. Once logged in, you'll be in either:
   - **Premium Dashboard** (`/dashboard`) - if you have Premium subscription
   - **Advanced Dashboard** (`/menu-dashboard`) - if you have Advanced subscription

2. Look at the **sidebar menu** on the left (or hamburger menu on mobile)

3. Click on **"Settings"** tab (should be near the bottom of the menu)

### Step 4: You Should See the Toggle
On the Settings page, you should see:

1. **Page Title**: "Settings"
2. **Card with "Business Type"** heading
3. **Two large clickable cards**:
   - **Restaurant Card** (with Building icon)
     - Shows "Restaurant" title
     - Shows "Uses 'Table Number' for orders"
   - **Hotel Card** (with Hotel icon)
     - Shows "Hotel" title
     - Shows "Uses 'Room Number' for orders"

4. **Save Settings Button** at the bottom

### Step 5: Test the Toggle
1. Click on the **"Hotel"** card - it should highlight with a blue border
2. Click the **"Save Settings"** button
3. You'll see a success toast message
4. The page will automatically reload after 1 second

### Step 6: Verify the Changes
After the page reloads, check these places to see "Room" instead of "Table":

#### In Dashboard:
1. Go to **Orders** tab (Premium only)
   - Order cards should show "Room X" instead of "Table X"
   - Search placeholder should say "room" instead of "table"

2. Go to **Service Calls** tab
   - Service call notifications should show "Room X" instead of "Table X"

#### In Customer Menu:
1. Open your restaurant's customer menu (scan QR code or go to `/menu/YOUR_RESTAURANT_ID`)
2. Add items to cart
3. Click "View Cart"
4. You should see **"Room Number"** input field instead of "Table Number"
5. The placeholder should say "Enter room number"

### Step 7: Switch Back to Restaurant
1. Go back to Settings
2. Click on **"Restaurant"** card
3. Click **"Save Settings"**
4. Page reloads
5. All "Room" references should change back to "Table"

## Troubleshooting

### If you don't see the Settings tab:
1. Make sure you're logged in
2. Check that you're on the dashboard page (not the customer menu)
3. Try refreshing the page
4. Check browser console for errors (F12)

### If the toggle buttons don't appear:
1. Check browser console for errors (F12)
2. Make sure the Settings component is loading (you should see the "Settings" heading)
3. Try clearing browser cache and refreshing

### If changes don't apply after saving:
1. Check browser console for errors
2. Verify the database was updated:
   - Go to Supabase Dashboard
   - Check `restaurants` table
   - Look at `business_type` column for your restaurant

### If you see TypeScript errors:
1. The build completed successfully, so TypeScript is fine
2. If you see errors in your IDE, try restarting the TypeScript server

## What to Look For

### Visual Indicators:
- ✅ Settings tab appears in sidebar
- ✅ Two large cards with Restaurant and Hotel options
- ✅ Selected card has blue border and highlighted background
- ✅ Save button is visible and clickable
- ✅ Success toast appears after saving
- ✅ Page reloads automatically

### Functional Changes:
- ✅ "Table Number" → "Room Number" in customer menu
- ✅ "Table X" → "Room X" in order notifications
- ✅ "Table X" → "Room X" in service calls
- ✅ "table" → "room" in search placeholders
- ✅ All toast messages use correct terminology

## Database Verification

To verify the database was updated:

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `pnakpaqvjxzoekrneumk`
3. Go to Table Editor
4. Open `restaurants` table
5. Find your restaurant row
6. Check the `business_type` column
7. It should show either `'restaurant'` or `'hotel'`

## Need Help?

If the Settings tab is not appearing or the toggle is not working:
1. Check that all files were saved
2. Restart the dev server (`npm run dev`)
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try in incognito/private browsing mode
5. Check browser console for any errors
