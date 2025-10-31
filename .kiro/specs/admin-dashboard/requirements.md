# Requirements Document

## Introduction

This document outlines the requirements for a Super Admin Dashboard that allows platform administrators to manage restaurant accounts, including the ability to enable/disable restaurant dashboards and QR code services. The system will provide centralized control over all registered restaurants with secure authentication.

## Glossary

- **Super Admin Dashboard**: A privileged administrative interface accessible only to platform administrators
- **Restaurant Account**: A registered restaurant entity in the system with associated menu, orders, and QR code
- **Service Status**: A boolean flag indicating whether a restaurant's services (dashboard and QR code) are active or disabled
- **QR Code Service**: The customer-facing menu accessible via QR code scan
- **Dashboard Service**: The restaurant owner's management interface
- **Admin Credentials**: Email and password combination used for super admin authentication

## Requirements

### Requirement 1: Super Admin Authentication

**User Story:** As a platform administrator, I want to securely log in to the admin dashboard, so that only authorized personnel can manage restaurant accounts.

#### Acceptance Criteria

1. WHEN the admin navigates to "/admindashboard", THE System SHALL display a login form with email and password fields
2. WHEN the admin enters email "sayanbanik66@gmail.com" and password "8119811655", THE System SHALL authenticate the credentials against stored admin credentials
3. IF authentication succeeds, THEN THE System SHALL grant access to the admin dashboard interface
4. IF authentication fails, THEN THE System SHALL display an error message "Invalid credentials" and prevent access
5. WHEN the admin is authenticated, THE System SHALL maintain the session until logout or timeout

### Requirement 2: Restaurant List Display

**User Story:** As a platform administrator, I want to view all registered restaurants in a list, so that I can see which restaurants are using the platform.

#### Acceptance Criteria

1. WHEN the admin accesses the dashboard, THE System SHALL display a list of all registered restaurants
2. THE System SHALL show restaurant name, email, phone number, registration date, and current service status for each restaurant
3. THE System SHALL display the total count of registered restaurants
4. THE System SHALL update the list in real-time when restaurant data changes
5. THE System SHALL sort restaurants by registration date with newest first by default

### Requirement 3: Service Status Management

**User Story:** As a platform administrator, I want to enable or disable restaurant services, so that I can control which restaurants have active access to the platform.

#### Acceptance Criteria

1. WHEN the admin clicks a toggle switch for a restaurant, THE System SHALL update the service_enabled status in the database
2. WHEN a restaurant's service is disabled, THE System SHALL set the is_active field to false in the restaurants table
3. WHEN a restaurant's service is enabled, THE System SHALL set the is_active field to true in the restaurants table
4. THE System SHALL display a confirmation dialog before disabling a restaurant's service
5. THE System SHALL show a success notification after status change completes

### Requirement 4: Disabled Service Customer Experience

**User Story:** As a customer, when I scan a QR code for a disabled restaurant, I want to see a clear message, so that I know to contact the restaurant directly.

#### Acceptance Criteria

1. WHEN a customer scans a QR code for a disabled restaurant, THE System SHALL check the is_active status before loading the menu
2. IF the restaurant is_active equals false, THEN THE System SHALL display a message "This restaurant's digital menu is currently unavailable. Please contact the restaurant directly."
3. THE System SHALL display the restaurant's contact information including phone and email on the disabled service page
4. THE System SHALL NOT display menu items, cart, or ordering functionality when service is disabled
5. THE System SHALL apply this check on every page load for customer-facing routes

### Requirement 5: Disabled Service Restaurant Owner Experience

**User Story:** As a restaurant owner, when my service is disabled, I want to see a notification in my dashboard, so that I understand why I cannot access certain features.

#### Acceptance Criteria

1. WHEN a restaurant owner logs into their dashboard and service is disabled, THE System SHALL display a prominent banner message
2. THE System SHALL show the message "Your account has been temporarily disabled. Please contact support at sayanbanik66@gmail.com"
3. WHEN service is disabled, THE System SHALL prevent the restaurant owner from creating new menu items or categories
4. WHEN service is disabled, THE System SHALL prevent the restaurant owner from receiving new orders
5. THE System SHALL allow the restaurant owner to view existing data in read-only mode when disabled

### Requirement 6: Admin Dashboard Security

**User Story:** As a platform administrator, I want the admin dashboard to be secure, so that unauthorized users cannot access or modify restaurant accounts.

#### Acceptance Criteria

1. THE System SHALL require authentication for all admin dashboard routes
2. WHEN an unauthenticated user attempts to access "/admindashboard/*", THE System SHALL redirect to the login page
3. THE System SHALL store admin credentials securely using Supabase authentication
4. THE System SHALL implement session timeout after 2 hours of inactivity
5. THE System SHALL log all admin actions including service status changes with timestamp and admin email

### Requirement 7: Database Schema Updates

**User Story:** As a developer, I want the database schema to support service status tracking, so that the system can store and retrieve restaurant active status.

#### Acceptance Criteria

1. THE System SHALL add an is_active boolean column to the restaurants table with default value true
2. THE System SHALL add an admin_users table with columns: id, email, password_hash, created_at, updated_at
3. THE System SHALL add an admin_actions_log table with columns: id, admin_email, action_type, restaurant_id, timestamp, details
4. THE System SHALL create a database index on restaurants.is_active for query performance
5. THE System SHALL insert the initial admin user with email "sayanbanik66@gmail.com" during migration

### Requirement 8: Search and Filter Functionality

**User Story:** As a platform administrator, I want to search and filter restaurants, so that I can quickly find specific restaurants to manage.

#### Acceptance Criteria

1. THE System SHALL provide a search input field that filters restaurants by name or email
2. THE System SHALL provide filter options for "All", "Active", and "Disabled" restaurants
3. WHEN the admin types in the search field, THE System SHALL update the restaurant list in real-time
4. WHEN the admin selects a filter, THE System SHALL show only restaurants matching that status
5. THE System SHALL display "No restaurants found" when search or filter returns zero results
