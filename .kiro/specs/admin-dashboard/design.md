# Admin Dashboard Design Document

## Overview

The Admin Dashboard is a secure, privileged interface that allows platform administrators to manage restaurant accounts. The system uses Supabase for authentication, database operations, and real-time updates. The design follows a clean, table-based layout with toggle switches for quick service management.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Admin Login    │
│   (/admindash)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Admin Dashboard                   │
│   - Restaurant List                 │
│   - Search & Filter                 │
│   - Service Toggle                  │
│   - Activity Log                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Supabase Backend                  │
│   - Authentication                  │
│   - Database (PostgreSQL)           │
│   - Real-time Subscriptions         │
└─────────────────────────────────────┘
```

### Component Structure

```
src/
├── pages/
│   ├── AdminLogin.tsx          # Admin authentication page
│   └── AdminDashboard.tsx      # Main admin interface
├── components/
│   └── admin/
│       ├── RestaurantTable.tsx # Restaurant list with toggles
│       ├── SearchFilter.tsx    # Search and filter controls
│       └── ActivityLog.tsx     # Admin action history
├── hooks/
│   └── useAdminAuth.tsx        # Admin authentication hook
└── lib/
    └── adminAuth.ts            # Admin auth utilities
```

## Components and Interfaces

### 1. AdminLogin Component

**Purpose:** Secure authentication for admin access

**Props:** None

**State:**
```typescript
interface LoginState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
}
```

**Key Features:**
- Email and password input fields
- Form validation
- Error handling with user-friendly messages
- Redirect to dashboard on success
- Session management

**Authentication Flow:**
1. User enters credentials
2. System validates against admin_users table
3. On success, create session and redirect to /admindashboard
4. On failure, display error message

### 2. AdminDashboard Component

**Purpose:** Main interface for managing restaurants

**State:**
```typescript
interface DashboardState {
  restaurants: Restaurant[];
  filteredRestaurants: Restaurant[];
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'disabled';
  isLoading: boolean;
  selectedRestaurant: Restaurant | null;
}

interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  logo_url: string | null;
  user_id: string;
}
```

**Key Features:**
- Real-time restaurant list updates
- Search by name or email
- Filter by active/disabled status
- Toggle service status with confirmation
- Display statistics (total, active, disabled counts)
- Responsive table layout

### 3. RestaurantTable Component

**Purpose:** Display restaurants in a sortable, filterable table

**Props:**
```typescript
interface RestaurantTableProps {
  restaurants: Restaurant[];
  onToggleStatus: (restaurantId: string, newStatus: boolean) => Promise<void>;
  isLoading: boolean;
}
```

**Columns:**
- Logo (thumbnail)
- Restaurant Name
- Email
- Phone
- Registration Date
- Status (Active/Disabled badge)
- Actions (Toggle switch)

**Features:**
- Sortable columns
- Status badge with color coding (green for active, red for disabled)
- Toggle switch with confirmation dialog
- Loading states during status updates

### 4. SearchFilter Component

**Purpose:** Provide search and filter controls

**Props:**
```typescript
interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | 'active' | 'disabled';
  onFilterChange: (filter: 'all' | 'active' | 'disabled') => void;
  stats: {
    total: number;
    active: number;
    disabled: number;
  };
}
```

**Features:**
- Search input with debouncing (300ms)
- Filter buttons (All, Active, Disabled)
- Statistics display
- Clear search button

## Data Models

### Database Schema Changes

#### 1. restaurants table (modification)

```sql
ALTER TABLE restaurants 
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

CREATE INDEX idx_restaurants_is_active ON restaurants(is_active);
```

#### 2. admin_users table (new)

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial admin user
INSERT INTO admin_users (email, password_hash)
VALUES ('sayanbanik66@gmail.com', crypt('8119811655', gen_salt('bf')));
```

#### 3. admin_actions_log table (new)

```sql
CREATE TABLE admin_actions_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'enable_service', 'disable_service', 'login'
  restaurant_id UUID REFERENCES restaurants(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB
);

CREATE INDEX idx_admin_actions_log_timestamp ON admin_actions_log(timestamp DESC);
CREATE INDEX idx_admin_actions_log_restaurant ON admin_actions_log(restaurant_id);
```

### API Functions

#### 1. Admin Authentication

```typescript
// Check admin credentials
async function authenticateAdmin(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('password_hash')
    .eq('email', email)
    .single();
  
  if (error || !data) return false;
  
  // Verify password using pgcrypto
  const { data: verified } = await supabase.rpc('verify_admin_password', {
    p_email: email,
    p_password: password
  });
  
  return verified;
}
```

#### 2. Toggle Restaurant Status

```typescript
async function toggleRestaurantStatus(
  restaurantId: string, 
  isActive: boolean,
  adminEmail: string
): Promise<void> {
  // Update restaurant status
  const { error: updateError } = await supabase
    .from('restaurants')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', restaurantId);
  
  if (updateError) throw updateError;
  
  // Log the action
  await supabase.from('admin_actions_log').insert({
    admin_email: adminEmail,
    action_type: isActive ? 'enable_service' : 'disable_service',
    restaurant_id: restaurantId,
    details: { previous_status: !isActive, new_status: isActive }
  });
}
```

#### 3. Fetch All Restaurants

```typescript
async function fetchAllRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, email, phone, is_active, created_at, logo_url, user_id')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}
```

## Error Handling

### Authentication Errors
- Invalid credentials: Display "Invalid email or password"
- Network errors: Display "Connection error. Please try again"
- Session expired: Redirect to login with message

### Service Toggle Errors
- Database error: Display "Failed to update status. Please try again"
- Permission error: Display "Unauthorized action"
- Network error: Retry with exponential backoff

### Customer-Facing Disabled Service

```typescript
// In CustomerMenu.tsx
useEffect(() => {
  async function checkRestaurantStatus() {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('is_active, name, email, phone')
      .eq('id', restaurantId)
      .single();
    
    if (!restaurant?.is_active) {
      setServiceDisabled(true);
      setRestaurantContact({
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone
      });
    }
  }
  
  checkRestaurantStatus();
}, [restaurantId]);
```

**Disabled Service UI:**
```tsx
{serviceDisabled && (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="max-w-md w-full p-8 text-center">
      <div className="mb-6">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Service Unavailable</h1>
        <p className="text-muted-foreground">
          This restaurant's digital menu is currently unavailable.
        </p>
      </div>
      
      <div className="bg-muted p-4 rounded-lg mb-6">
        <h2 className="font-semibold mb-2">Contact Information</h2>
        <p className="text-sm">{restaurantContact.name}</p>
        {restaurantContact.phone && (
          <p className="text-sm">Phone: {restaurantContact.phone}</p>
        )}
        {restaurantContact.email && (
          <p className="text-sm">Email: {restaurantContact.email}</p>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        Please contact the restaurant directly for assistance.
      </p>
    </Card>
  </div>
)}
```

## Testing Strategy

### Unit Tests
1. Admin authentication logic
2. Restaurant status toggle function
3. Search and filter logic
4. Form validation

### Integration Tests
1. Admin login flow
2. Restaurant status update with database
3. Real-time updates subscription
4. Activity logging

### E2E Tests
1. Complete admin login to status toggle flow
2. Customer accessing disabled restaurant
3. Restaurant owner seeing disabled account message
4. Search and filter functionality

### Security Tests
1. Unauthorized access attempts
2. SQL injection prevention
3. XSS prevention in search inputs
4. Session hijacking prevention

## Performance Considerations

1. **Database Indexing:** Index on `is_active` column for fast filtering
2. **Search Debouncing:** 300ms delay to reduce database queries
3. **Pagination:** Load restaurants in batches of 50 for large datasets
4. **Real-time Optimization:** Subscribe only to necessary fields
5. **Caching:** Cache restaurant list for 30 seconds to reduce queries

## Security Considerations

1. **Password Storage:** Use bcrypt hashing via pgcrypto
2. **Session Management:** 2-hour timeout with secure cookies
3. **CSRF Protection:** Implement CSRF tokens for state-changing operations
4. **Rate Limiting:** Limit login attempts to 5 per 15 minutes
5. **Audit Trail:** Log all admin actions with timestamps
6. **Role-Based Access:** Verify admin role on every protected route

## UI/UX Design

### Color Scheme
- Active status: Green (#10b981)
- Disabled status: Red (#ef4444)
- Primary actions: Blue (#3b82f6)
- Background: Clean white/dark mode support

### Responsive Design
- Desktop: Full table layout
- Tablet: Condensed table with horizontal scroll
- Mobile: Card-based layout instead of table

### Accessibility
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly status announcements
- High contrast mode support
