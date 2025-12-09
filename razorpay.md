# Razorpay Payment Integration Flow

This document describes how the Razorpay recurring subscription system works in AddMenu.

---

## Overview

The system supports two payment modes:

1. **New User Registration** - Payment required before account creation (prevents fake accounts)
2. **Existing User Subscription** - Logged-in users can subscribe or upgrade their plan

---

## Flow 1: New User Registration with Payment

### Step 1: User Fills Registration Form
- User enters email, password, restaurant name, and description
- User selects a subscription plan (Basic, Pro, etc.) and billing cycle (monthly/yearly)
- User clicks "Register & Pay"

### Step 2: Create Pending Registration
- System validates the email format and password strength (minimum 8 characters)
- System stores registration data temporarily in `pending_registrations` table
- Registration expires after 30 minutes if payment is not completed
- Any previous pending registration for the same email is deleted

### Step 3: Create Razorpay Subscription
- System calls `create-registration-subscription` edge function
- If Razorpay plan doesn't exist for the selected plan/cycle, it creates one
- System creates a Razorpay subscription and returns the subscription ID
- The subscription is linked to the pending registration

### Step 4: Payment Modal Opens
- Razorpay checkout modal opens with pre-filled user details
- User completes payment using their preferred method (card, UPI, netbanking, etc.)

### Step 5: Payment Verification
- After successful payment, Razorpay returns payment ID, subscription ID, and signature
- System calls `verify-registration-payment` edge function
- System verifies the Razorpay signature using HMAC-SHA256
- System confirms payment status with Razorpay API (must be "captured" or "authorized")

### Step 6: Account Creation
- System creates the user account in Supabase Auth
- System creates the user profile with restaurant details
- System creates the subscription record with "active" status
- System records the payment transaction
- System clears the password from pending registration (security)
- System automatically signs in the user

### Step 7: Redirect to Dashboard
- User is redirected to their dashboard with full access to their plan features

---

## Flow 2: Existing User Subscription

### Step 1: User Selects Plan
- Logged-in user navigates to pricing page
- User selects a plan and billing cycle
- User clicks "Subscribe" or "Upgrade"

### Step 2: Session Refresh
- System refreshes the user's authentication session to ensure valid token
- This prevents 401 errors if the session was about to expire

### Step 3: Create Razorpay Subscription
- System calls `create-razorpay-subscription` edge function
- System verifies user is authenticated
- If Razorpay plan doesn't exist, it creates one
- System creates a Razorpay subscription

### Step 4: Handle Existing Subscription
- **If user has NO existing subscription**: Create new subscription record with "pending" status
- **If user has INACTIVE subscription**: Update existing record with new plan details
- **If user has ACTIVE subscription (upgrade)**: Store new plan in "pending" fields to preserve current subscription until payment completes

### Step 5: Payment Modal Opens
- Razorpay checkout modal opens with user's email pre-filled
- User completes payment

### Step 6: Payment Verification
- System calls `verify-razorpay-subscription` edge function
- System verifies the Razorpay signature
- System confirms payment with Razorpay API

### Step 7: Activate Subscription
- **For new subscriptions**: Update status to "active", set period dates
- **For upgrades**: Move pending plan to active, cancel old Razorpay subscription, clear pending fields
- System records the payment transaction

### Step 8: Access Granted
- User immediately has access to new plan features
- Page refreshes to reflect updated subscription status

---

## Flow 3: Plan Upgrade (Safe Upgrade Pattern)

This flow ensures users never lose their current subscription if upgrade payment fails.

### Step 1: User Initiates Upgrade
- User with active subscription selects a higher-tier plan
- System detects this is an upgrade (user already has active subscription)

### Step 2: Store Pending Upgrade
- System stores new plan details in "pending" fields:
  - `pending_plan_id` - The new plan ID
  - `pending_razorpay_subscription_id` - The new Razorpay subscription ID
  - `pending_billing_cycle` - The new billing cycle
- Current subscription remains completely untouched

### Step 3: Payment Attempt
- User attempts payment for the new plan
- If payment fails, nothing changes - user keeps current subscription
- If user closes modal, nothing changes - user keeps current subscription

### Step 4: Successful Payment
- System verifies payment signature
- System moves pending fields to active fields:
  - `plan_id` = `pending_plan_id`
  - `razorpay_subscription_id` = `pending_razorpay_subscription_id`
  - `billing_cycle` = `pending_billing_cycle`
- System cancels the old Razorpay subscription
- System clears all pending fields
- User now has the upgraded plan

### Why This Pattern?
- User never loses access if payment fails
- No race conditions between old and new subscriptions
- Clean rollback - just clear pending fields if needed
- Audit trail maintained

---

## Flow 4: Webhook Handling

Razorpay sends webhook events for subscription lifecycle changes.

### Supported Events

**subscription.activated**
- Triggered when subscription becomes active
- System updates subscription status to "active"
- System sets current period start/end dates

**subscription.charged**
- Triggered on successful recurring payment
- System records the payment transaction
- System updates current period end date

**subscription.pending**
- Triggered when payment is pending
- System updates status to "pending"

**subscription.halted**
- Triggered when subscription is halted (payment failures)
- System updates status to "halted"

**subscription.cancelled**
- Triggered when subscription is cancelled
- System updates status to "cancelled"
- System sets cancelled_at timestamp

**payment.captured**
- Triggered when payment is successfully captured
- System records the payment transaction

**payment.failed**
- Triggered when payment fails
- System records failed transaction for debugging

### Webhook Security
- All webhooks are verified using Razorpay webhook secret
- Signature is validated using HMAC-SHA256
- Events are stored in `razorpay_webhook_events` table for idempotency
- Duplicate events are ignored (checked by event_id)

---

## Flow 5: Subscription Status Check

### How Status is Determined
- System uses `get_user_subscription_status` function
- Function checks:
  1. Does user have a subscription record?
  2. Is the status "active"?
  3. Is current_period_end in the future (or null)?
- Returns subscription details and plan information

### Feature Access Check
- `check_bell_feature_access` function checks if user can use bell feature
- Checks if user's plan has `bell_feature_enabled = true`
- Checks if subscription is active

---

## Error Handling

### Payment Gateway Unavailable
- If Razorpay returns 502 or gateway errors
- Show user-friendly message: "Payment gateway temporarily unavailable"
- Suggest trying again in a few minutes

### Session Expired
- If 401 error during payment
- Automatically refresh session before retrying
- If still fails, ask user to refresh page

### Payment Failed
- Show Razorpay's error description
- For upgrades, user keeps current subscription
- User can retry immediately

### Registration Expired
- If pending registration is older than 30 minutes
- Mark as expired, ask user to start over
- Previous payment (if any) would need manual refund

---

## Security Measures

1. **Signature Verification** - All payments verified using HMAC-SHA256
2. **Service Role for Sensitive Operations** - Edge functions use service role key for database writes
3. **Password Cleared After Registration** - Temporary password storage is cleared immediately
4. **Session Refresh** - Tokens refreshed before API calls to prevent expiry issues
5. **Webhook Idempotency** - Duplicate webhook events are ignored
6. **RLS Policies** - Users can only view their own subscriptions and transactions

---

## Testing Checklist

### New User Registration
- [ ] Registration form validates email and password
- [ ] Payment modal opens with correct amount
- [ ] Account is created after successful payment
- [ ] User is automatically logged in
- [ ] Subscription shows as active in dashboard

### Existing User Subscription
- [ ] Logged-in user can select and pay for plan
- [ ] Subscription activates after payment
- [ ] Features are immediately accessible

### Plan Upgrade
- [ ] Current subscription preserved during upgrade attempt
- [ ] If payment fails, user keeps current plan
- [ ] If payment succeeds, user gets new plan
- [ ] Old Razorpay subscription is cancelled

### Webhooks
- [ ] subscription.activated updates status
- [ ] subscription.charged records payment
- [ ] subscription.cancelled updates status
- [ ] Duplicate events are ignored

### Error Scenarios
- [ ] Network error shows friendly message
- [ ] Session expiry is handled gracefully
- [ ] Payment failure doesn't break anything
