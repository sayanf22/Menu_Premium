# Quick Menu Dish - Product Overview

A real-time restaurant menu and ordering system for restaurants and their customers.

## Core User Roles

1. **Customers** - Browse menus via QR code, place orders, receive real-time status updates
2. **Restaurant Owners** - Manage menus, track orders, view analytics via dashboard
3. **Platform Admins** - Manage all restaurants, enable/disable services, view activity logs

## Subscription Plans

1. **Menu Only** (₹199/month) - Digital menu display without ordering
   - Menu management with categories
   - Toggle item availability
   - QR code generation
   - Basic analytics
   - Route: `/menu-dashboard`

2. **Full Service** (₹399/month) - Complete menu and ordering system
   - Everything in Menu Only
   - Real-time order management
   - Order notifications with sound
   - Customer feedback collection
   - Route: `/dashboard`

## Key Features

- Real-time order notifications with sound/vibration (Full Service only)
- QR code-based menu access for customers
- Menu management with categories
- Order status tracking (preparing → completed)
- Dark/light mode support
- Animated UI with Framer Motion
- Optional OneSignal push notifications
- Razorpay payment integration for subscriptions

## Business Context

- Multi-tenant SaaS platform (multiple restaurants)
- Tiered subscription model with Razorpay recurring payments
- Row Level Security (RLS) for data isolation
- Safe upgrade pattern for plan changes (pending fields)
