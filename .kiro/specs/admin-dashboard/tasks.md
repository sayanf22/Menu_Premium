# Implementation Plan

- [x] 1. Database Schema Setup


  - Create database migrations for admin dashboard tables and columns
  - Add is_active column to restaurants table with default true
  - Create admin_users table with email and password_hash columns
  - Create admin_actions_log table for audit trail
  - Create database indexes for performance optimization
  - Insert initial admin user with provided credentials
  - Create RPC function for password verification
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [ ] 2. Admin Authentication System
  - [ ] 2.1 Create admin authentication utilities
    - Write adminAuth.ts with authentication helper functions
    - Implement authenticateAdmin function using Supabase
    - Implement session management functions
    - Add password verification using pgcrypto

    - _Requirements: 1.2, 1.3, 1.4_
  
  - [ ] 2.2 Create useAdminAuth custom hook
    - Implement authentication state management
    - Add login, logout, and session check functions
    - Handle authentication errors

    - Implement session timeout (2 hours)
    - _Requirements: 1.5, 6.4_
  
  - [ ] 2.3 Build AdminLogin page component
    - Create login form with email and password fields
    - Add form validation
    - Implement login submission handler
    - Add error message display
    - Redirect to dashboard on successful login

    - Style with responsive design
    - _Requirements: 1.1, 1.3, 1.4_

- [ ] 3. Admin Dashboard Core Components
  - [ ] 3.1 Create AdminDashboard page component
    - Set up component structure and layout
    - Implement authentication check and redirect

    - Add header with logout button
    - Create main content area for restaurant list
    - Add loading states
    - _Requirements: 2.1, 6.1, 6.2_
  
  - [ ] 3.2 Implement restaurant data fetching
    - Create fetchAllRestaurants function
    - Set up real-time subscription for restaurant updates
    - Handle loading and error states
    - Implement data refresh mechanism
    - _Requirements: 2.1, 2.4_
  
  - [ ] 3.3 Build RestaurantTable component
    - Create table structure with all required columns
    - Add logo thumbnail display
    - Implement status badge with color coding
    - Add toggle switch for service status
    - Create confirmation dialog for status changes
    - Handle loading states during updates
    - _Requirements: 2.2, 3.1, 3.2, 3.4_

- [ ] 4. Search and Filter Functionality
  - [ ] 4.1 Create SearchFilter component
    - Build search input with icon
    - Implement debounced search (300ms delay)
    - Add filter buttons (All, Active, Disabled)
    - Display statistics (total, active, disabled counts)
    - Add clear search button
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 4.2 Implement search and filter logic
    - Create search filtering function
    - Create status filtering function
    - Combine search and filter results
    - Handle empty results state
    - Update restaurant list in real-time
    - _Requirements: 8.3, 8.4, 8.5_

- [ ] 5. Service Status Management
  - [ ] 5.1 Implement toggleRestaurantStatus function
    - Create database update function
    - Add optimistic UI updates
    - Implement error handling and rollback
    - Add success notifications
    - Log action to admin_actions_log table
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 6.5_
  
  - [ ] 5.2 Create confirmation dialog
    - Build modal component for confirmation

    - Display restaurant name and action
    - Add confirm and cancel buttons
    - Handle dialog state management
    - _Requirements: 3.4_

- [x] 6. Customer-Facing Disabled Service Handling

  - [ ] 6.1 Update CustomerMenu component
    - Add restaurant status check on page load
    - Fetch restaurant is_active status
    - Store disabled state and contact info
    - Implement conditional rendering
    - _Requirements: 4.1, 4.5_
  
  - [ ] 6.2 Create disabled service UI
    - Build service unavailable card
    - Display restaurant contact information
    - Add appropriate icons and messaging
    - Style with responsive design
    - Ensure accessibility compliance
    - _Requirements: 4.2, 4.3, 4.4_

- [ ] 7. Restaurant Owner Dashboard Updates
  - [ ] 7.1 Add service status check to restaurant dashboard
    - Check is_active status on dashboard load
    - Store disabled state in component
    - Implement conditional feature access
    - _Requirements: 5.1, 5.3, 5.4_
  
  - [ ] 7.2 Create disabled account notification banner
    - Build prominent banner component
    - Display support contact information
    - Add styling for visibility
    - Position at top of dashboard
    - _Requirements: 5.2_
  
  - [ ] 7.3 Implement read-only mode
    - Disable menu item creation buttons
    - Disable category creation buttons
    - Disable order acceptance
    - Allow viewing existing data
    - Show disabled state tooltips
    - _Requirements: 5.3, 5.4, 5.5_

- [ ] 8. Activity Logging and Audit Trail
  - [ ] 8.1 Create ActivityLog component
    - Build log table with timestamp, action, and details
    - Fetch recent admin actions
    - Display admin email and action type
    - Add pagination for log entries
    - Style with responsive design
    - _Requirements: 6.5_
  
  - [ ] 8.2 Implement logging for all admin actions
    - Log successful logins
    - Log service enable/disable actions
    - Log logout events
    - Include relevant details in JSONB field
    - _Requirements: 6.5_

- [ ] 9. Security Implementation
  - [ ] 9.1 Add route protection
    - Create ProtectedRoute component for admin routes
    - Implement authentication check
    - Redirect unauthenticated users to login
    - Handle session expiration
    - _Requirements: 6.1, 6.2_
  
  - [ ] 9.2 Implement session management
    - Set up session timeout (2 hours)
    - Add session refresh mechanism
    - Handle logout on timeout
    - Clear session data on logout
    - _Requirements: 6.4_
  
  - [ ] 9.3 Add rate limiting for login attempts
    - Implement login attempt tracking
    - Limit to 5 attempts per 15 minutes
    - Display lockout message
    - Add cooldown timer
    - _Requirements: 6.5_

- [ ] 10. UI Polish and Responsive Design
  - [ ] 10.1 Style admin dashboard with Tailwind CSS
    - Apply consistent color scheme
    - Add hover and focus states
    - Implement dark mode support
    - Ensure proper spacing and alignment
    - _Requirements: 2.1, 2.2_
  
  - [ ] 10.2 Implement responsive layouts
    - Desktop: Full table layout
    - Tablet: Condensed table with scroll
    - Mobile: Card-based layout
    - Test on multiple screen sizes
    - _Requirements: 2.1_
  


  - [ ] 10.3 Add loading and empty states
    - Create skeleton loaders for tables
    - Add empty state illustrations
    - Display helpful messages
    - Implement smooth transitions
    - _Requirements: 2.1, 8.5_

- [ ] 11. Update Routing Configuration
  - [ ] 11.1 Add admin routes to router
    - Add /admindashboard route for main dashboard
    - Add /admindashboard/login route for authentication
    - Configure route protection
    - Set up redirects
    - _Requirements: 1.1, 6.1, 6.2_

- [ ] 12. Generate Updated TypeScript Types
  - Generate new TypeScript types from Supabase schema
  - Update imports in all affected components
  - Verify type safety across the application
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 13. Testing and Quality Assurance
  - [ ] 13.1 Write unit tests
    - Test authentication functions
    - Test search and filter logic
    - Test status toggle function
    - Test form validation
    - _Requirements: All_
  
  - [ ] 13.2 Write integration tests
    - Test admin login flow
    - Test restaurant status update
    - Test real-time updates
    - Test activity logging
    - _Requirements: All_
  
  - [ ] 13.3 Perform manual testing
    - Test complete admin workflow
    - Test customer disabled service experience
    - Test restaurant owner disabled experience
    - Test on multiple browsers and devices
    - Verify accessibility compliance
    - _Requirements: All_

- [ ] 14. Documentation
  - [ ] 14.1 Update project documentation
    - Document admin dashboard usage
    - Add admin credentials management guide
    - Document database schema changes
    - Add troubleshooting section
    - _Requirements: All_
  
  - [ ] 14.2 Create admin user guide
    - Write step-by-step admin instructions
    - Document service management workflow
    - Add screenshots and examples
    - Include best practices
    - _Requirements: All_
