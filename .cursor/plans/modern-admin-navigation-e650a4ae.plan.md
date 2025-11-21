<!-- e650a4ae-6c4b-4696-a448-77af68ea6d67 c2d2fd9f-7f7b-41e4-989b-9b9405346f5f -->
# Modern Admin Panel with Side Navigation & User Management

## Overview

Transform the Mixmi admin web app with a modern side navigation layout (inspired by Puzzler design), add user management capabilities, and enhance the overall design with a professional, clean interface.

## Implementation Plan

### 1. Modern Side Navigation Layout

**Create new Sidebar component** (`admin-web/src/components/Sidebar.tsx`):

- Fixed left sidebar (250px width) with logo at top
- Navigation items: Dashboard, Orders, Users, Analytics, Settings
- Icons for each menu item
- Active state highlighting
- Hover effects
- User profile section at bottom with avatar, name, email
- Logout button in profile section
- Smooth transitions and modern styling

**Update App structure** (`admin-web/src/App.tsx`):

- Remove top header navigation
- Implement sidebar + main content layout (flex row)
- Main content area with top search bar and user profile (right side)
- Responsive design: sidebar collapses to hamburger menu on mobile

**Update global styles** (`admin-web/src/App.css`):

- Layout: `display: flex` with sidebar (fixed) + main (flex: 1)
- Remove old header/nav styles
- Add sidebar styles: white background, subtle shadow, rounded corners for menu items
- Content area: light gray background (#F8FAFC)
- Modern color palette: primary blue (#3B82F6), gray scales

### 2. User Management Feature

**Create Users page** (`admin-web/src/pages/Users.tsx`):

- Table view with columns: Avatar, Name, Email, Role, Status, Join Date, Actions
- Search bar: filter by name, email, username
- Filter buttons: All Users, Admins, Active, Suspended, Banned
- Status badges with colors (active: green, suspended: yellow, banned: red)
- Role badges (user, admin, superadmin)
- Statistics at top: Total Users, Active, Suspended, New Today
- Pagination for large user lists

**User Management Actions**:

- View user details modal (full profile info, orders history, created products)
- Edit user role (dropdown: user, admin, superadmin)
- Suspend/Unsuspend user with reason input
- Ban/Unban user
- View user activity (orders, products created)
- Export users to CSV

**Create User Service** (`admin-web/src/services/userService.ts`):

- `fetchUsers()`: get all users from Realtime Database
- `updateUserRole()`: update role and call Cloud Function to set claims
- `updateUserStatus()`: suspend/ban/activate user
- `getUserOrders()`: fetch user's order history from Firestore
- Real-time listener for user updates

### 3. Enhanced UI/UX Components

**Create shared components** (`admin-web/src/components/`):

- `Sidebar.tsx`: main navigation sidebar
- `TopBar.tsx`: search + notifications + user menu
- `StatCard.tsx`: reusable metric card component
- `DataTable.tsx`: reusable table with sorting/filtering
- `Modal.tsx`: reusable modal for details/forms
- `StatusBadge.tsx`: colored status badges
- `Avatar.tsx`: user avatar with fallback initials

**Improve existing pages**:

- Dashboard: cleaner card layouts, better spacing, modern charts
- Orders: consistent with new design language
- Add breadcrumbs for navigation context
- Loading skeletons instead of spinners
- Toast notifications for success/error messages

### 4. Design System Updates

**Color Palette**:

- Primary: #3B82F6 (blue)
- Success: #10B981 (green)
- Warning: #F59E0B (amber)
- Danger: #EF4444 (red)
- Gray scale: #F8FAFC, #E2E8F0, #64748B, #1E293B
- Background: #F8FAFC

**Typography**:

- Font family: Inter or System UI stack
- Headings: 600-700 weight
- Body: 400-500 weight
- Consistent sizing scale

**Spacing & Layout**:

- Consistent padding/margins: 8px, 16px, 24px, 32px
- Card border-radius: 12px
- Button border-radius: 8px
- Box shadows: subtle elevation

### 5. Responsive Design

**Mobile Adaptations**:

- Sidebar: collapse to overlay menu with hamburger icon
- Tables: horizontal scroll or card view on mobile
- Metrics: stack vertically on small screens
- Touch-friendly button sizes (min 44px)

## Files to Modify

**New Files**:

- `admin-web/src/components/Sidebar.tsx`
- `admin-web/src/components/TopBar.tsx`
- `admin-web/src/components/StatCard.tsx`
- `admin-web/src/components/DataTable.tsx`
- `admin-web/src/components/Modal.tsx`
- `admin-web/src/components/StatusBadge.tsx`
- `admin-web/src/components/Avatar.tsx`
- `admin-web/src/pages/Users.tsx`
- `admin-web/src/pages/Users.css`
- `admin-web/src/services/userService.ts`

**Modified Files**:

- `admin-web/src/App.tsx` - New layout structure
- `admin-web/src/App.css` - Complete redesign for sidebar layout
- `admin-web/src/pages/Dashboard.tsx` - Use new components
- `admin-web/src/pages/Dashboard.css` - Update to match design system
- `admin-web/src/pages/Orders.tsx` - Use new components
- `admin-web/src/pages/Orders.css` - Update to match design system
- `admin-web/src/pages/Login.tsx` - Slight polish
- `admin-web/src/pages/Login.css` - Update colors to match

## Technical Notes

- Use TypeScript interfaces for all data structures
- Implement proper error handling with user-friendly messages
- Add loading states for all async operations
- Ensure all Firebase Realtime Database queries are optimized
- Respect existing Firebase security rules
- Maintain compatibility with existing order management features

### To-dos

- [ ] Create reusable UI components (Sidebar, TopBar, StatCard, DataTable, Modal, StatusBadge, Avatar)
- [ ] Restructure App.tsx and App.css for modern sidebar navigation layout
- [ ] Build userService.ts with functions for fetching and managing users from Realtime Database
- [ ] Implement Users.tsx page with table, search, filters, and user management actions
- [ ] Update Dashboard page to use new components and match design system
- [ ] Update Orders page to use new components and match design system
- [ ] Polish Login page styling to match new design system
- [ ] Implement responsive design for mobile devices (collapsible sidebar, card views)