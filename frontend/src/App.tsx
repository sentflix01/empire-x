// @ts-nocheck
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import ScrollToTop from './components/ScrollToTop';
import { ThemeProvider } from 'next-themes';

// Layout
import AppLayout from '@/components/layout/AppLayout';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Onboarding from '@/pages/Onboarding';

// Core pages
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import Search from '@/pages/Search';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';
import ProfileEdit from '@/pages/ProfileEdit';

// Social
import HashtagFeed from '@/pages/HashtagFeed';

// Marketplace
import Marketplace from '@/pages/Marketplace';
import ProductCreate from '@/pages/ProductCreate';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Orders from '@/pages/Orders';
import Bookmarks from '@/pages/Bookmarks';

// Business
import BusinessCreate from '@/pages/BusinessCreate';
import BusinessAnalytics from '@/pages/BusinessAnalytics';
import ShowroomCreate from '@/pages/ShowroomCreate';
import ShowroomView from '@/pages/ShowroomView';
import Showrooms from '@/pages/Showrooms';
import ShowroomTemplates from '@/pages/ShowroomTemplates';
import CouponsManage from '@/pages/CouponsManage';

// Tasks
import Tasks from '@/pages/Tasks';
import TaskCreate from '@/pages/TaskCreate';
import TaskCalendar from '@/pages/TaskCalendar';

// Messaging
import Messages from '@/pages/Messages';
import ChatRoom from '@/pages/ChatRoom';

// Features
import Events from '@/pages/Events';
import EventCreate from '@/pages/EventCreate';
import Jobs from '@/pages/Jobs';
import JobCreate from '@/pages/JobCreate';
import Courses from '@/pages/Courses';
import CourseDetail from '@/pages/CourseDetail';
import Wallet from '@/pages/Wallet';
import NearbyMap from '@/pages/NearbyMap';
import Admin from '@/pages/Admin';

// Public routes — no auth required
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, authChecked } = useAuth();
  const location = useLocation();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-card">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl">👑</span>
          <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const isPublicPath = PUBLIC_PATHS.includes(location.pathname);
  if (!isAuthenticated && !isPublicPath) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (isAuthenticated && isPublicPath) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Protected routes inside AppLayout */}
      <Route element={<AppLayout />}>
        {/* Core */}
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/search" element={<Search />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* Social */}
        <Route path="/hashtag/:name" element={<HashtagFeed />} />

        {/* Profile */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/setup-business" element={<ProfileEdit />} />

        {/* Marketplace */}
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/products/create" element={<ProductCreate />} />
        <Route path="/products/edit/:id" element={<ProductCreate />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/coupons" element={<CouponsManage />} />

        {/* Business */}
        <Route path="/business/create" element={<BusinessCreate />} />
        <Route path="/business/edit/:id" element={<BusinessCreate />} />
        <Route path="/analytics" element={<BusinessAnalytics />} />
        <Route path="/showroom/create" element={<ShowroomCreate />} />
        <Route path="/showroom/templates" element={<ShowroomTemplates />} />
        <Route path="/showrooms" element={<Showrooms />} />
        <Route path="/showrooms/:id" element={<ShowroomView />} />

        {/* Tasks */}
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/create" element={<TaskCreate />} />
        <Route path="/tasks/calendar" element={<TaskCalendar />} />

        {/* Messaging */}
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<ChatRoom />} />

        {/* Features */}
        <Route path="/events" element={<Events />} />
        <Route path="/events/create" element={<EventCreate />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/create" element={<JobCreate />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/nearby" element={<NearbyMap />} />
        <Route path="/admin" element={<Admin />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <CartProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;

