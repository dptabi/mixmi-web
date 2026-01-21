import React, { useState, useEffect } from 'react';
import { db, storage, rtdb, auth } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { ref as rtdbRef, get as rtdbGet } from 'firebase/database';
import { ref, getDownloadURL, listAll } from 'firebase/storage';
import { format, formatDistanceToNow } from 'date-fns';
import TopBar from '../components/TopBar';
import './Orders.css';

interface OrderItem {
  productName?: string;
  size?: string;
  color?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  mockupImage?: string;
  mockupImageUrls?: string[];
  frontImage?: string;
  backImage?: string;
  imageUrls?: string[];
  exportPath?: string;
  storagePath?: string;
  assetPath?: string;
  exports?: string[];
  assets?: {
    mockups?: string[];
    front?: string;
    back?: string;
  };
  [key: string]: any;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  userId?: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: Timestamp | any; // Handle both Timestamp and other formats
  items: OrderItem[];
  adminDone?: boolean;
}

interface AssetGroup {
  mockups: string[];
  stickerFronts: string[];
  stickerBacks: string[];
  csvFiles: string[];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [orderAssets, setOrderAssets] = useState<AssetGroup | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const isOrderAssetsEnabled = false;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          userId: data.userId || data.user_id || null, // Support both userId and user_id
          adminDone: data.adminDone === true,
        };
      }) as Order[];

      console.log('📦 Loaded orders:', ordersData.length);
      ordersData.forEach(order => {
        console.log(`Order ${order.orderNumber}: userId=${order.userId}`);
      });

      setOrders(ordersData);
      setSelectedOrderIds(new Set());
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Failed to load orders. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Get the order to check payment method and current payment status
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) {
        alert('Order not found');
        return;
      }

      const orderData = orderDoc.data();
      const paymentMethod = orderData.paymentMethod;
      const currentPaymentStatus = orderData.paymentStatus;

      // Update order status
      const updateData: any = {
        orderStatus: newStatus,
        updatedAt: serverTimestamp()
      };

      // If COD order is being marked as completed/delivered, mark as paid
      if (paymentMethod === 'cash_on_delivery' && 
          currentPaymentStatus === 'pending' &&
          (newStatus === 'completed' || newStatus === 'delivered')) {
        updateData.paymentStatus = 'paid';
        console.log('✅ COD order completed, marking as paid');
      }

      await updateDoc(doc(db, 'orders', orderId), updateData);
      loadOrders();
      
      if (updateData.paymentStatus === 'paid') {
        alert('✅ Order status updated and marked as paid!');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    }
  };

  const updateAdminFlagsForOrders = async (orderIds: string[], updates: { adminDone?: boolean }) => {
    if (orderIds.length === 0) {
      return;
    }
    setBulkUpdating(true);
    try {
      const updateData = {
        ...updates,
        adminUpdatedAt: serverTimestamp(),
      } as const;
      await Promise.all(orderIds.map((orderId) => updateDoc(doc(db, 'orders', orderId), updateData)));
      await loadOrders();
    } catch (error) {
      console.error('Error updating admin flags:', error);
      alert('Failed to update order flags. Check console for details.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const markSelectedAsDone = async () => {
    await updateAdminFlagsForOrders(Array.from(selectedOrderIds), { adminDone: true });
  };

  const markSelectedAsNotDone = async () => {
    await updateAdminFlagsForOrders(Array.from(selectedOrderIds), { adminDone: false });
  };

  const markSelectedAsPaid = async () => {
    if (!window.confirm(`Mark ${selectedOrderIds.size} selected order(s) as paid?`)) return;
    await updatePaymentStatusForOrders(Array.from(selectedOrderIds), 'paid');
  };

  const markSelectedAsUnpaid = async () => {
    if (!window.confirm(`Mark ${selectedOrderIds.size} selected order(s) as unpaid (pending)?`)) return;
    await updatePaymentStatusForOrders(Array.from(selectedOrderIds), 'pending');
  };

  const markOrderAsDone = async (orderId: string) => {
    await updateAdminFlagsForOrders([orderId], { adminDone: true });
  };

  const markOrderAsNotDone = async (orderId: string) => {
    await updateAdminFlagsForOrders([orderId], { adminDone: false });
  };

  const updatePaymentStatusForOrders = async (
    orderIds: string[],
    paymentStatus: 'paid' | 'pending'
  ) => {
    if (orderIds.length === 0) {
      return;
    }

    setBulkUpdating(true);
    try {
      const blockedOrderNumbers: string[] = [];

      const promises = orderIds.map(async (orderId) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) {
          return;
        }

        if (paymentStatus === 'pending' && (order.orderStatus === 'delivered' || order.orderStatus === 'completed')) {
          blockedOrderNumbers.push(order.orderNumber);
          return;
        }

        const updateData: any = {
          paymentStatus,
          updatedAt: serverTimestamp(),
        };

        if (paymentStatus === 'paid') {
          // If non-COD order is still pending (unpaid), move it to confirmed (to_ship)
          if (order.paymentMethod !== 'cash_on_delivery' && order.orderStatus === 'pending') {
            updateData.orderStatus = 'confirmed';
          }
        } else {
          // If non-COD order was moved to confirmed/processing due to payment, revert back to pending/to_pay
          if (order.paymentMethod !== 'cash_on_delivery' && (order.orderStatus === 'confirmed' || order.orderStatus === 'processing')) {
            updateData.orderStatus = 'pending';
          }
        }

        await updateDoc(doc(db, 'orders', orderId), updateData);
      });

      await Promise.all(promises);

      if (blockedOrderNumbers.length > 0) {
        alert(`❌ Cannot mark delivered/completed orders as unpaid.\n\nSkipped: ${blockedOrderNumbers.join(', ')}`);
      }

      await loadOrders();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status. Check console for details.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const markAsPaid = async (orderId: string) => {
    if (!window.confirm('Mark this order as paid?')) return;
    await updatePaymentStatusForOrders([orderId], 'paid');
  };

  const markAsUnpaid = async (orderId: string) => {
    if (!window.confirm('Mark this order as unpaid (pending)?')) return;
    await updatePaymentStatusForOrders([orderId], 'pending');
  };

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        orderStatus: 'cancelled',
        updatedAt: serverTimestamp()
      });
      loadOrders();
      alert('❌ Order cancelled!');
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order');
    }
  };

  const deleteOrder = async (orderId: string) => {
    // First, verify the order is cancelled
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) {
        alert('❌ Order not found');
        return;
      }
      
      const orderData = orderDoc.data();
      if (orderData.orderStatus !== 'cancelled') {
        alert('❌ Only cancelled orders can be deleted');
        return;
      }
    } catch (error) {
      console.error('Error checking order status:', error);
      alert('❌ Failed to verify order status');
      return;
    }
    
    if (!window.confirm('⚠️ WARNING: This will permanently delete this CANCELLED order. This action cannot be undone!\n\nAre you absolutely sure you want to delete this cancelled order?')) return;
    
    const secondConfirm = window.confirm('🚨 FINAL CONFIRMATION 🚨\n\nThis will PERMANENTLY DELETE this CANCELLED order from the database.\n\nType "DELETE" in the next prompt to confirm.');
    if (!secondConfirm) return;
    
    const finalConfirm = window.prompt('Type "DELETE" to permanently delete this cancelled order:');
    if (finalConfirm !== 'DELETE') {
      alert('❌ Deletion cancelled. You must type "DELETE" exactly.');
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      loadOrders();
      alert('🗑️ Cancelled order permanently deleted!');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  // Fix existing orders with incorrect status mappings
  const fixExistingOrders = async () => {
    if (!window.confirm('This will update all existing orders to match the new status logic. Continue?')) return;
    
    try {
      console.log('🔧 Starting bulk order status fix...');
      let updatedCount = 0;
      
      for (const order of orders) {
        let needsUpdate = false;
        const updateData: any = {};
        
        // Fix paid orders that are still in "pending" status
        if (order.paymentStatus === 'paid' && 
            (order.orderStatus === 'pending' || order.orderStatus === 'to_pay') &&
            order.paymentMethod !== 'cash_on_delivery') {
          updateData.orderStatus = 'confirmed';
          needsUpdate = true;
          console.log(`✅ Fixing paid order ${order.orderNumber}: pending → confirmed`);
        }
        
        // Fix COD orders that should be in "confirmed" status
        else if (order.paymentMethod === 'cash_on_delivery' && 
                 order.orderStatus === 'pending') {
          updateData.orderStatus = 'confirmed';
          needsUpdate = true;
          console.log(`✅ Fixing COD order ${order.orderNumber}: pending → confirmed`);
        }
        
        // Fix delivered orders that should be marked as paid (COD)
        else if (order.paymentMethod === 'cash_on_delivery' && 
                 order.paymentStatus === 'pending' &&
                 (order.orderStatus === 'delivered' || order.orderStatus === 'completed')) {
          updateData.paymentStatus = 'paid';
          needsUpdate = true;
          console.log(`✅ Fixing delivered COD order ${order.orderNumber}: marking as paid`);
        }
        
        if (needsUpdate) {
          updateData.updatedAt = serverTimestamp();
          await updateDoc(doc(db, 'orders', order.id), updateData);
          updatedCount++;
        }
      }
      
      console.log(`🎉 Bulk update complete! Updated ${updatedCount} orders.`);
      alert(`✅ Fixed ${updatedCount} orders! Refreshing the list...`);
      loadOrders();
      
    } catch (error) {
      console.error('Error fixing orders:', error);
      alert('Failed to fix orders');
    }
  };

  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    if (!isOrderAssetsEnabled) {
      setLoadingAssets(false);
      setOrderAssets(null);
      return;
    }
    setLoadingAssets(true);
    setOrderAssets(null);
    
    // Extract assets asynchronously
    try {
      console.log('🔍 Extracting assets for order:', order.orderNumber);
      console.log('📦 Order userId:', order.userId);
      console.log('📧 Order customerEmail:', order.customerEmail);
      console.log('📋 Order items:', order.items);
      
      // Get userId - try from order first, then lookup by email
      let userId = order.userId;
      if (!userId && order.customerEmail) {
        console.log('🔍 Looking up userId from customer email...');
        userId = await getUserIdFromEmail(order.customerEmail) || undefined;
        console.log('📦 Resolved userId:', userId);
      }
      
      const assets = await extractOrderAssets(order.items || [], userId);
      console.log('✅ Extracted assets:', assets);
      
      setOrderAssets(assets);
    } catch (error) {
      console.error('❌ Error extracting order assets:', error);
      setOrderAssets({ mockups: [], stickerFronts: [], stickerBacks: [], csvFiles: [] });
    } finally {
      setLoadingAssets(false);
    }
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetails(false);
    setOrderAssets(null);
    setLoadingAssets(false);
  };

  const filteredOrders = orders.filter(order => {
    let matchesFilter = false;
    
    if (filter === 'all') {
      matchesFilter = true;
    } else if (filter === 'to_pay') {
      // ONLY orders that need payment (incomplete checkout or failed payment)
      // Exclude COD and paid orders
      matchesFilter = order.orderStatus === 'pending' && 
                      order.paymentStatus !== 'paid' && 
                      order.paymentMethod !== 'cash_on_delivery';
    } else if (filter === 'to_ship') {
      // Orders ready to ship: paid orders OR COD orders
      matchesFilter = order.orderStatus === 'confirmed' ||
                     (order.orderStatus === 'pending' && 
                      (order.paymentStatus === 'paid' || order.paymentMethod === 'cash_on_delivery')) ||
                     order.orderStatus === 'processing';
    } else if (filter === 'to_receive') {
      // Include orders shipped and waiting for delivery
      matchesFilter = order.orderStatus === 'shipped';
    } else if (filter === 'completed') {
      // Include completed and delivered orders
      matchesFilter = order.orderStatus === 'delivered';
    } else {
      // Direct status match for other filters
      matchesFilter = order.orderStatus === filter;
    }
    
    const matchesSearch = searchTerm === '' || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((previous) => {
      const next = new Set(previous);
      if (next.has(orderId)) {
        next.delete(orderId);
        return next;
      }
      next.add(orderId);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedOrderIds(new Set());
  };

  const selectAllFiltered = () => {
    setSelectedOrderIds(new Set(filteredOrders.map((order) => order.id)));
  };

  const areAllFilteredSelected = filteredOrders.length > 0 && filteredOrders.every((order) => selectedOrderIds.has(order.id));
  const selectedCount = selectedOrderIds.size;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      to_pay: '#f59e0b',        // Orange - needs payment
      to_ship: '#3b82f6',       // Blue - ready to ship
      to_receive: '#8b5cf6',    // Purple - shipped, waiting for delivery
      completed: '#10b981',     // Green - delivered and completed
      returned: '#f97316',      // Orange - returned items
      cancelled: '#ef4444',     // Red - cancelled
      // Legacy statuses for backward compatibility
      pending: '#f59e0b',       // Orange - default to pay
      processing: '#3b82f6',    // Blue - to ship
      confirmed: '#3b82f6',     // Blue - to ship (confirmed = ready to ship)
      shipped: '#8b5cf6',       // Purple - to receive
      delivered: '#10b981',     // Green - completed
    };
    return colors[status] || '#6b7280';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      to_pay: '💳',           // Payment needed
      to_ship: '📦',          // Ready to ship
      to_receive: '🚚',       // Shipped, waiting for delivery
      completed: '✅',        // Delivered and completed
      returned: '↩️',         // Returned items
      cancelled: '❌',        // Cancelled
      // Legacy statuses for backward compatibility
      pending: '💳',          // Default to pay
      processing: '📦',       // To ship
      confirmed: '📦',        // To ship (confirmed = ready to ship)
      shipped: '🚚',          // To receive
      delivered: '✅',        // Completed
    };
    return icons[status] || '❓';
  };

  const getPaymentIcon = (status: string) => {
    return status === 'paid' ? '✅' : '⏳';
  };

  // Map legacy statuses to new status flow for display
  const getDisplayStatus = (status: string, order?: Order) => {
    // If order is provided, check payment status for smarter mapping
    if (order) {
      if (status === 'pending') {
        // Pending + unpaid + not COD = To Pay
        if (order.paymentStatus !== 'paid' && order.paymentMethod !== 'cash_on_delivery') {
          return 'To Pay';
        }
        // Pending + (paid OR COD) = To Ship
        return 'To Ship';
      }
      if (status === 'confirmed' || status === 'processing') {
        return 'To Ship';
      }
    }

    const statusMap: Record<string, string> = {
      // New statuses (keep as is)
      to_pay: 'To Pay',
      to_ship: 'To Ship', 
      to_receive: 'To Receive',
      completed: 'Completed',
      returned: 'Returned',
      cancelled: 'Cancelled',
      // Legacy statuses (map to new)
      pending: 'To Pay', // Default if no order context
      processing: 'To Ship',
      shipped: 'To Receive',
      delivered: 'Completed',
      confirmed: 'To Ship', // Confirmed = ready to ship
    };
    return statusMap[status] || status;
  };

  const getTotalRevenue = () => {
    return orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, order) => sum + (order.total || 0), 0);
  };

  const getPendingRevenue = () => {
    return orders
      .filter(o => o.paymentStatus === 'pending')
      .reduce((sum, order) => sum + (order.total || 0), 0);
  };

  // Helper function to safely convert timestamp to date
  const getOrderDate = (createdAt: any) => {
    try {
      if (!createdAt) return 'N/A';
      
      // If it's a Firestore Timestamp
      if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        return createdAt.toDate().toLocaleDateString();
      }
      
      // If it's already a Date object
      if (createdAt instanceof Date) {
        return createdAt.toLocaleDateString();
      }
      
      // If it's a number (timestamp)
      if (typeof createdAt === 'number') {
        return new Date(createdAt).toLocaleDateString();
      }
      
      // If it's a string
      if (typeof createdAt === 'string') {
        return new Date(createdAt).toLocaleDateString();
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Helper function to get relative time
  const getOrderDateRelative = (createdAt: any) => {
    try {
      if (!createdAt) return 'N/A';
      
      let date: Date;
      
      // If it's a Firestore Timestamp
      if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        date = createdAt.toDate();
      }
      // If it's already a Date object
      else if (createdAt instanceof Date) {
        date = createdAt;
      }
      // If it's a number (timestamp)
      else if (typeof createdAt === 'number') {
        date = new Date(createdAt);
      }
      // If it's a string
      else if (typeof createdAt === 'string') {
        date = new Date(createdAt);
      }
      else {
        return 'N/A';
      }
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting relative date:', error);
      return 'N/A';
    }
  };

  // Get userId from customer email by looking up in Realtime Database
  const getUserIdFromEmail = async (email: string): Promise<string | null> => {
    try {
      const usersRef = rtdbRef(rtdb, 'users');
      const snapshot = await rtdbGet(usersRef);
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const usersData = snapshot.val();
      // Find user with matching email
      for (const [uid, userData] of Object.entries(usersData)) {
        if ((userData as any)?.email === email) {
          console.log(`✅ Found userId ${uid} for email ${email}`);
          return uid;
        }
      }
      
      console.warn(`⚠️ No user found with email ${email}`);
      return null;
    } catch (error) {
      console.error('Error looking up userId from email:', error);
      return null;
    }
  };

  // Get download URL from Firebase Storage path
  const getStorageDownloadURL = async (storagePath: string): Promise<string | null> => {
    try {
      const storageRef = ref(storage, storagePath);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error(`Error getting download URL for ${storagePath}:`, error);
      return null;
    }
  };

  // Extract order assets from items
  const extractOrderAssets = async (items: OrderItem[], userId?: string): Promise<AssetGroup> => {
    const assets: AssetGroup = {
      mockups: [],
      stickerFronts: [],
      stickerBacks: [],
      csvFiles: [],
    };

    for (const item of items) {
      // Extract mockup images
      if (item.mockupImage) {
        assets.mockups.push(item.mockupImage);
      }
      if (item.mockupImageUrls && Array.isArray(item.mockupImageUrls)) {
        assets.mockups.push(...item.mockupImageUrls.filter(url => url && typeof url === 'string'));
      }
      if (item.assets?.mockups && Array.isArray(item.assets.mockups)) {
        assets.mockups.push(...item.assets.mockups.filter(url => url && typeof url === 'string'));
      }

      // Extract sticker front images
      if (item.frontImage) {
        assets.stickerFronts.push(item.frontImage);
      }
      if (item.assets?.front) {
        assets.stickerFronts.push(item.assets.front);
      }
      if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls[0]) {
        assets.stickerFronts.push(item.imageUrls[0]);
      }

      // Extract sticker back images
      if (item.backImage) {
        assets.stickerBacks.push(item.backImage);
      }
      if (item.assets?.back) {
        assets.stickerBacks.push(item.assets.back);
      }
      if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls[1]) {
        assets.stickerBacks.push(item.imageUrls[1]);
      }

      // Handle Firebase Storage paths
      // Check for exportPath, storagePath, assetPath, or exports array
      const storagePaths: string[] = [];
      
      if (item.exportPath && typeof item.exportPath === 'string') {
        storagePaths.push(item.exportPath);
      }
      if (item.storagePath && typeof item.storagePath === 'string') {
        storagePaths.push(item.storagePath);
      }
      if (item.assetPath && typeof item.assetPath === 'string') {
        storagePaths.push(item.assetPath);
      }
      if (item.exports && Array.isArray(item.exports)) {
        storagePaths.push(...item.exports.filter(path => path && typeof path === 'string'));
      }

      // Process explicit storage paths first
      for (const path of storagePaths) {
        const url = await getStorageDownloadURL(path);
        if (url) {
          // Determine asset type from path
          const pathLower = path.toLowerCase();
          if (pathLower.endsWith('.csv')) {
            assets.csvFiles.push(url);
          } else
          if (pathLower.includes('mockup') || pathLower.includes('preview')) {
            assets.mockups.push(url);
          } else if (pathLower.includes('front') || pathLower.includes('_front')) {
            assets.stickerFronts.push(url);
          } else if (pathLower.includes('back') || pathLower.includes('_back')) {
            assets.stickerBacks.push(url);
          } else {
            // Default: treat as mockup
            assets.mockups.push(url);
          }
        }
      }
    }

    // If userId is available, check exports/{userId}/ directory for assets
    // This finds assets stored in Firebase Storage that may not be explicitly referenced in order items
    // Assets are stored in subdirectories like: exports/{userId}/product_1768744720591_sweatshirt/
    if (userId) {
      try {
        console.log(`🔍 Checking Firebase Storage for userId: ${userId}`);
        const exportsRef = ref(storage, `exports/${userId}`);
        const exportsList = await listAll(exportsRef);
        
        console.log(`📁 Found ${exportsList.items.length} files and ${exportsList.prefixes.length} subdirectories in exports/${userId}/`);
        
        // Process files directly in exports/{userId}/
        for (const itemRef of exportsList.items) {
          const url = await getStorageDownloadURL(itemRef.fullPath);
          if (url) {
            const fileName = itemRef.name.toLowerCase();
            console.log(`📄 Processing file: ${itemRef.name}`);
            if (fileName.endsWith('.csv')) {
              assets.csvFiles.push(url);
            } else if (fileName.startsWith('mockup_')) {
              assets.mockups.push(url);
            } else if (fileName.includes('_front_') && !fileName.startsWith('mockup_')) {
              assets.stickerFronts.push(url);
            } else if (fileName.includes('_back_') && !fileName.startsWith('mockup_')) {
              assets.stickerBacks.push(url);
            } else if (fileName.includes('mockup') || fileName.includes('preview')) {
              assets.mockups.push(url);
            } else if (fileName.includes('front') && !fileName.startsWith('mockup_')) {
              assets.stickerFronts.push(url);
            } else if (fileName.includes('back') && !fileName.startsWith('mockup_')) {
              assets.stickerBacks.push(url);
            } else {
              // Default: treat as mockup if unclear
              assets.mockups.push(url);
            }
          }
        }
        
        // Process subdirectories (like product_1768744720591_sweatshirt)
        for (const prefixRef of exportsList.prefixes) {
          try {
            console.log(`📂 Checking subdirectory: ${prefixRef.name}`);
            const subDirList = await listAll(prefixRef);
            console.log(`📁 Found ${subDirList.items.length} files in ${prefixRef.name}/`);
            
            for (const itemRef of subDirList.items) {
              const url = await getStorageDownloadURL(itemRef.fullPath);
              if (url) {
                const fileName = itemRef.name.toLowerCase();
                console.log(`📄 Processing file in subdirectory: ${itemRef.name}`);
                // Categorize based on filename patterns
                if (fileName.endsWith('.csv')) {
                  console.log(`✅ Categorized as CSV: ${itemRef.name}`);
                  assets.csvFiles.push(url);
                } else if (fileName.startsWith('mockup_')) {
                  // mockup_front_xs_white_sweatshirt_72dpi -> mockup
                  console.log(`✅ Categorized as mockup: ${itemRef.name}`);
                  assets.mockups.push(url);
                } else if (fileName.includes('_front_') && !fileName.startsWith('mockup_')) {
                  // dptabi_front_white_19bd166fbab0 -> sticker front
                  console.log(`✅ Categorized as sticker front: ${itemRef.name}`);
                  assets.stickerFronts.push(url);
                } else if (fileName.includes('_back_') && !fileName.startsWith('mockup_')) {
                  // sticker back
                  console.log(`✅ Categorized as sticker back: ${itemRef.name}`);
                  assets.stickerBacks.push(url);
                } else if (fileName.includes('mockup') || fileName.includes('preview')) {
                  console.log(`✅ Categorized as mockup (contains 'mockup'): ${itemRef.name}`);
                  assets.mockups.push(url);
                } else if (fileName.includes('front') && !fileName.startsWith('mockup_')) {
                  console.log(`✅ Categorized as sticker front (contains 'front'): ${itemRef.name}`);
                  assets.stickerFronts.push(url);
                } else if (fileName.includes('back') && !fileName.startsWith('mockup_')) {
                  console.log(`✅ Categorized as sticker back (contains 'back'): ${itemRef.name}`);
                  assets.stickerBacks.push(url);
                } else {
                  // Default: treat as mockup if unclear
                  console.log(`✅ Categorized as mockup (default): ${itemRef.name}`);
                  assets.mockups.push(url);
                }
              }
            }
          } catch (subDirError) {
            console.warn(`⚠️ Error listing subdirectory ${prefixRef.name}:`, subDirError);
          }
        }
        
        console.log(`✅ Final asset counts - Mockups: ${assets.mockups.length}, Fronts: ${assets.stickerFronts.length}, Backs: ${assets.stickerBacks.length}`);
      } catch (error: any) {
        console.error('❌ Error listing exports directory:', error);
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);
        // Don't fail completely if exports directory doesn't exist or can't be accessed
      }
    } else {
      console.warn('⚠️ No userId provided, cannot check Firebase Storage exports directory');
    }

    // Remove duplicates
    assets.mockups = Array.from(new Set(assets.mockups));
    assets.stickerFronts = Array.from(new Set(assets.stickerFronts));
    assets.stickerBacks = Array.from(new Set(assets.stickerBacks));
    assets.csvFiles = Array.from(new Set(assets.csvFiles));

    return assets;
  };

  const downloadBlob = (blob: Blob, filename: string): void => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  };

  const escapeCsvCell = (value: unknown): string => {
    const raw = value === null || value === undefined ? '' : String(value);
    const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (/[",\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  };

  const resolveOrderCreatedDate = (createdAt: any): Date | null => {
    try {
      if (!createdAt) return null;
      if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        return createdAt.toDate();
      }
      if (createdAt instanceof Date) {
        return createdAt;
      }
      if (typeof createdAt === 'number') {
        return new Date(createdAt);
      }
      if (typeof createdAt === 'string') {
        return new Date(createdAt);
      }
      return null;
    } catch {
      return null;
    }
  };

  const formatOrderDateForCsv = (createdAt: any): string => {
    const date = resolveOrderCreatedDate(createdAt);
    if (!date || Number.isNaN(date.getTime())) {
      return '';
    }
    return format(date, 'd/M/yyyy');
  };

  const resolveShippingAddress = (order: any): { street: string; province: string; city: string } => {
    const street =
      order?.shippingStreet ||
      order?.shipping_address?.street ||
      order?.shippingAddress?.street ||
      order?.shippingAddress?.line1 ||
      order?.shippingAddress?.address1 ||
      order?.address?.street ||
      order?.address?.line1 ||
      order?.address?.address1 ||
      order?.deliveryAddress?.street ||
      '';
    const province =
      order?.shippingProvince ||
      order?.shipping_address?.province ||
      order?.shippingAddress?.province ||
      order?.address?.province ||
      order?.deliveryAddress?.province ||
      '';
    const city =
      order?.shippingCity ||
      order?.shipping_address?.city ||
      order?.shippingAddress?.city ||
      order?.address?.city ||
      order?.deliveryAddress?.city ||
      '';
    return {
      street: String(street || ''),
      province: String(province || ''),
      city: String(city || ''),
    };
  };

  const resolveCustomerPhone = (order: any): string => {
    return String(order?.customerPhone || order?.phone || order?.phoneNumber || '');
  };

  const resolveBrandFromItem = (item: any): string => {
    const explicit =
      item?.brand ||
      item?.creator ||
      item?.creatorUsername ||
      item?.sellerUsername ||
      item?.sellerName ||
      '';
    if (explicit) {
      return String(explicit);
    }
    const name = String(item?.productName || '');
    const firstToken = name.includes('_') ? name.split('_')[0] : '';
    return firstToken;
  };

  const resolveBuyerUsernameFromOrder = async (order: Order): Promise<string> => {
    try {
      const cachedValue = (order as any).__buyerUsername;
      if (typeof cachedValue === 'string' && cachedValue) {
        return cachedValue;
      }

      let userId: string | undefined = order.userId;
      if (!userId && order.customerEmail) {
        userId = (await getUserIdFromEmail(order.customerEmail)) || undefined;
      }

      if (!userId) {
        const emailPrefix = String(order.customerEmail || '').split('@')[0] || '';
        return emailPrefix;
      }

      const userRef = rtdbRef(rtdb, `users/${userId}`);
      const snapshot = await rtdbGet(userRef);
      const userData = snapshot.val() || {};

      const username =
        userData.username ||
        userData.userName ||
        userData.handle ||
        userData.displayName ||
        userData.name ||
        '';

      const normalized = String(username || '').trim();
      if (normalized) {
        (order as any).__buyerUsername = normalized;
        return normalized;
      }

      const emailPrefix = String(order.customerEmail || '').split('@')[0] || '';
      return emailPrefix;
    } catch (error) {
      console.warn('Failed to resolve buyer username:', error);
      const emailPrefix = String(order.customerEmail || '').split('@')[0] || '';
      return emailPrefix;
    }
  };

  const normalizeLineitemName = (value: string): string => {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }
    // App-like normalization:
    // Keep only "{anything}_product_{first4digits}" prefix and drop the rest.
    // Example:
    // "dptabi_skull_001_product_1768744720591_sweatshirt" -> "dptabi_skull_001_product_1768"
    const match = raw.match(/^(.*?_product_)(\d{4})/i);
    if (match) {
      return `${match[1]}${match[2]}`.replace(/_+$/g, '');
    }
    return raw;
  };

  const resolveLineitemNameForCsv = (item: any, buyerUsername: string): string => {
    const rawBase = String(
      item?.lineitemName ||
      item?.lineItemName ||
      item?.line_item_name ||
      item?.name ||
      item?.productName ||
      ''
    ).trim();

    if (!rawBase) {
      return '';
    }

    const buyerPrefix = buyerUsername ? `${buyerUsername}_` : '';
    const alreadyPrefixed =
      buyerPrefix && rawBase.toLowerCase().startsWith(buyerPrefix.toLowerCase());
    const combined = alreadyPrefixed ? rawBase : `${buyerPrefix}${rawBase}`;
    return normalizeLineitemName(combined);
  };

  const toTitleCase = (value: string): string => {
    return value
      .split(/[\s_-]+/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const resolveSkuFromItem = (item: any): string => {
    const size = String(item?.size || '').trim();
    const color = String(item?.color || '').trim();
    const productTypeRaw = String(
      item?.productType ||
      item?.product ||
      item?.productNameShort ||
      item?.itemType ||
      item?.category ||
      ''
    ).trim();
    let productType = productTypeRaw ? toTitleCase(productTypeRaw) : '';
    if (!productType) {
      const name = String(item?.productName || '').toLowerCase();
      if (name.includes('sweatshirt')) productType = 'Sweatshirt';
      else if (name.includes('hoodie')) productType = 'Hoodie';
      else if (name.includes('tshirt') || name.includes('t-shirt')) productType = 'Tshirt';
    }
    const parts = [size, color, productType].filter(Boolean);
    if (parts.length === 0) {
      return '';
    }
    return `${parts.join('-')}-|`;
  };

  const resolveTotalItems = (order: Order): number => {
    return (order.items || []).reduce((sum, item) => sum + Number(item.quantity ?? 1), 0);
  };

  const createOrderCsvContent = (order: Order, buyerUsername: string): string => {
    const header = [
      'Brand',
      'Order Date',
      'Order Name',
      'Lineitem Name',
      'SKU',
      'Lineitem Quantity',
      'Phone',
      'Shipping Street',
      'Province',
      'City',
      'Total Items',
      'Total',
      'Fin.Status',
    ].join(',');

    const shipping = resolveShippingAddress(order as any);
    const phone = resolveCustomerPhone(order as any);
    const orderDate = formatOrderDateForCsv(order.createdAt);
    const totalItems = resolveTotalItems(order);

    const itemRows = (order.items || []).map((item) => {
      const brand = buyerUsername || resolveBrandFromItem(item as any);
      const sku = resolveSkuFromItem(item as any);
      const lineitemName = resolveLineitemNameForCsv(item as any, buyerUsername);
      return [
        escapeCsvCell(brand),
        escapeCsvCell(orderDate),
        escapeCsvCell(order.customerName),
        escapeCsvCell(lineitemName),
        escapeCsvCell(sku),
        escapeCsvCell(item.quantity ?? 1),
        escapeCsvCell(phone),
        escapeCsvCell(shipping.street),
        escapeCsvCell(shipping.province),
        escapeCsvCell(shipping.city),
        escapeCsvCell(totalItems),
        escapeCsvCell(order.total),
        escapeCsvCell(order.paymentStatus),
      ].join(',');
    });

    return [header, ...itemRows].join('\n');
  };

  const downloadOrderCsv = async (order: Order) => {
    const buyerUsername = await resolveBuyerUsernameFromOrder(order);
    const csv = createOrderCsvContent(order, buyerUsername);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `order-${order.orderNumber}.csv`);
  };

  const getStoragePathFromInput = (input: string): string | null => {
    const isHttpUrl = input.startsWith('http://') || input.startsWith('https://');
    if (!isHttpUrl) {
      return input;
    }
    return extractStoragePath(input);
  };

  const getDownloadFunctionUrl = (): string => {
    return 'https://us-central1-mixmi-66529.cloudfunctions.net/downloadStorageFile';
  };

  const downloadFromFunction = async (storagePath: string, filename: string) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User is not authenticated');
    }

    const idToken = await user.getIdToken(true);
    const functionUrl = getDownloadFunctionUrl();

    // First try: fetch with Authorization header (best UX, no navigation)
    try {
      const downloadUrl = `${functionUrl}?path=${encodeURIComponent(storagePath)}&filename=${encodeURIComponent(filename)}`;
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const blob = await response.blob();
      downloadBlob(blob, filename);
      return;
    } catch (error) {
      console.warn('Cloud Function fetch download failed, falling back to navigation:', error);
    }

    // Fallback: navigation download (no CORS), token passed via query param
    const downloadUrl = `${functionUrl}?path=${encodeURIComponent(storagePath)}&filename=${encodeURIComponent(filename)}&token=${encodeURIComponent(idToken)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download a single image (uses Cloud Function to bypass Storage CORS)
  const downloadImage = async (url: string, filename: string) => {
    try {
      const storagePath = getStoragePathFromInput(url);
      if (storagePath) {
        await downloadFromFunction(storagePath, filename);
        return;
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Download failed. Opening the file in a new tab as a fallback.');
      window.open(url, '_blank');
    }
  };

  // Helper to extract storage path from Firebase Storage URL
  const extractStoragePath = (url: string): string | null => {
    const urlMatch = url.match(/\/o\/([^?]+)/);
    if (urlMatch) {
      const encodedPath = urlMatch[1];
      return decodeURIComponent(encodedPath.replace(/%2F/g, '/'));
    }
    return null;
  };

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <TopBar
        title="Order Management"
        subtitle={`${orders.length} total orders • ₱${getTotalRevenue().toFixed(2)} paid revenue • ₱${getPendingRevenue().toFixed(2)} pending`}
        actions={
          <>
            <button 
              onClick={fixExistingOrders}
              className="btn-outline"
              title="Fix existing orders to match new status logic"
            >
              🔧 Fix Orders
            </button>
            <button onClick={loadOrders} className="btn-primary">
              🔄 Refresh
            </button>
          </>
        }
      />

      <div className="orders-toolbar">
        <input
          type="text"
          placeholder="Search by order number, customer name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="filter-buttons">
          <button 
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'active' : ''}
          >
            📋 All ({orders.length})
          </button>
          <button 
            onClick={() => setFilter('to_pay')}
            className={filter === 'to_pay' ? 'active' : ''}
          >
            💳 To Pay ({orders.filter(o => 
              o.orderStatus === 'to_pay' || 
              (o.orderStatus === 'pending' && o.paymentStatus !== 'paid' && o.paymentMethod !== 'cash_on_delivery')
            ).length})
          </button>
          <button 
            onClick={() => setFilter('to_ship')}
            className={filter === 'to_ship' ? 'active' : ''}
          >
            📦 To Ship ({orders.filter(o => 
              o.orderStatus === 'confirmed' ||
              (o.orderStatus === 'pending' && (o.paymentStatus === 'paid' || o.paymentMethod === 'cash_on_delivery')) ||
              o.orderStatus === 'processing'
            ).length})
          </button>
          <button 
            onClick={() => setFilter('to_receive')}
            className={filter === 'to_receive' ? 'active' : ''}
          >
            🚚 To Receive ({orders.filter(o => o.orderStatus === 'to_receive' || o.orderStatus === 'shipped').length})
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={filter === 'completed' ? 'active' : ''}
          >
            ✅ Completed ({orders.filter(o => o.orderStatus === 'completed' || o.orderStatus === 'delivered').length})
          </button>
          <button 
            onClick={() => setFilter('returned')}
            className={filter === 'returned' ? 'active' : ''}
          >
            ↩️ Returned ({orders.filter(o => o.orderStatus === 'returned').length})
          </button>
          <button 
            onClick={() => setFilter('cancelled')}
            className={filter === 'cancelled' ? 'active' : ''}
          >
            ❌ Cancelled ({orders.filter(o => o.orderStatus === 'cancelled').length})
          </button>
        </div>
      </div>

      <div className="orders-table-container">
        {selectedCount > 0 && (
          <div className="orders-selection-bar">
            <div className="orders-selection-text">
              Selected: <strong>{selectedCount}</strong>
            </div>
            <div className="orders-selection-actions">
              <button
                className="btn-outline"
                onClick={markSelectedAsPaid}
                disabled={bulkUpdating}
                title="Mark selected orders as paid"
              >
                💵
              </button>
              <button
                className="btn-outline"
                onClick={markSelectedAsUnpaid}
                disabled={bulkUpdating}
                title="Mark selected orders as unpaid (pending)"
              >
                ↩️
              </button>
              <button className="btn-outline" onClick={markSelectedAsDone} disabled={bulkUpdating} title="Mark selected orders as done">
                ✅
              </button>
              <button className="btn-outline" onClick={markSelectedAsNotDone} disabled={bulkUpdating} title="Mark selected orders as not done">
                ⬜
              </button>
              <button className="btn-outline" onClick={selectAllFiltered} disabled={areAllFilteredSelected}>
                Select all (filtered)
              </button>
              <button className="btn-outline" onClick={clearSelection}>
                Clear selection
              </button>
            </div>
          </div>
        )}
        <table className="orders-table">
          <thead>
            <tr>
              <th className="orders-select-col">
                <input
                  type="checkbox"
                  checked={areAllFilteredSelected}
                  aria-label="Select all filtered orders"
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAllFiltered();
                      return;
                    }
                    clearSelection();
                  }}
                />
              </th>
              <th>Order #</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id} className={order.adminDone === true ? 'order-row-done' : ''}>
                <td className="orders-select-col">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.has(order.id)}
                    aria-label={`Select order ${order.orderNumber}`}
                    onChange={() => toggleOrderSelection(order.id)}
                  />
                </td>
                <td>
                  <div className="order-number-line">
                    <strong>{order.orderNumber}</strong>
                    {order.adminDone === true && <span className="order-done-check" title="Done">✅</span>}
                  </div>
                  <div className="order-items-count">
                    {order.items?.length || 0} items
                  </div>
                </td>
                <td>
                  <div className="customer-info">
                    <div className="customer-name">{order.customerName}</div>
                    <div className="customer-email">{order.customerEmail}</div>
                    <div className="customer-phone">{order.customerPhone}</div>
                  </div>
                </td>
                <td>
                  <strong>₱{order.total?.toFixed(2) || '0.00'}</strong>
                </td>
                <td>
                  <div className="payment-info">
                    <span 
                      className="payment-status"
                      style={{
                        backgroundColor: order.paymentStatus === 'paid' ? '#d1fae5' : '#fef3c7',
                        color: order.paymentStatus === 'paid' ? '#065f46' : '#92400e'
                      }}
                    >
                      {getPaymentIcon(order.paymentStatus)} {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                    <div className="payment-method">{order.paymentMethod || 'N/A'}</div>
                  </div>
                </td>
                <td>
                  <select 
                    value={order.orderStatus}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    className="status-select"
                    style={{ borderColor: getStatusColor(order.orderStatus) }}
                  >
                    <option value="to_pay">💳 To Pay</option>
                    <option value="to_ship">📦 To Ship</option>
                    <option value="to_receive">🚚 To Receive</option>
                    <option value="completed">✅ Completed</option>
                    <option value="returned">↩️ Returned</option>
                    <option value="cancelled">❌ Cancelled</option>
                    {/* Legacy options for backward compatibility */}
                    <option value="pending">⏳ Pending (Legacy)</option>
                    <option value="processing">🔄 Processing (Legacy)</option>
                    <option value="shipped">🚚 Shipped (Legacy)</option>
                    <option value="delivered">✅ Delivered (Legacy)</option>
                  </select>
                </td>
                <td>
                  <div className="date-info">
                    <div>{getOrderDate(order.createdAt)}</div>
                    <div className="date-relative">
                      {getOrderDateRelative(order.createdAt)}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => viewOrderDetails(order)}
                      className="view-details-button"
                    >
                      👁️ View
                    </button>

                    {order.adminDone === true ? (
                      <button
                        onClick={() => markOrderAsNotDone(order.id)}
                        className="flag-button"
                        disabled={bulkUpdating}
                        title="Mark as not done"
                      >
                        ✅ Done
                      </button>
                    ) : (
                      <button
                        onClick={() => markOrderAsDone(order.id)}
                        className="flag-button"
                        disabled={bulkUpdating}
                        title="Mark as done"
                      >
                        ✅ Done
                      </button>
                    )}
                    
                    {order.paymentStatus !== 'paid' && (
                      <button
                        onClick={() => markAsPaid(order.id)}
                        className="mark-paid-button"
                      >
                        💵 Mark Paid
                      </button>
                    )}

                    {order.paymentStatus === 'paid' && (
                      <button
                        onClick={() => markAsUnpaid(order.id)}
                        className="mark-unpaid-button"
                        title="Mark this order as unpaid (pending)"
                      >
                        ↩️ Unpaid
                      </button>
                    )}
                    
                    {order.orderStatus !== 'cancelled' && 
                     order.orderStatus !== 'completed' && 
                     order.orderStatus !== 'delivered' && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="cancel-button"
                      >
                        ❌ Cancel
                      </button>
                    )}
                    
                    {order.orderStatus === 'cancelled' && (
                      <button
                        onClick={() => deleteOrder(order.id)}
                        className="delete-button"
                        title="Permanently delete this cancelled order"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="no-orders">
          {searchTerm ? 'No orders match your search' : 'No orders found'}
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="modal-overlay" onClick={closeOrderDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Order Details - {selectedOrder.orderNumber}</h2>
              <button onClick={closeOrderDetails} className="close-button">×</button>
            </div>
            
            <div className="modal-body">
              <div className="order-details-grid">
                <div className="detail-section">
                  <h3>👤 Customer Information</h3>
                  <div className="detail-item">
                    <strong>Name:</strong> {selectedOrder.customerName}
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong> {selectedOrder.customerEmail}
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong> {selectedOrder.customerPhone}
                  </div>
                </div>

                <div className="detail-section">
                  <h3>💰 Payment Information</h3>
                  <div className="detail-item">
                    <strong>Total:</strong> ₱{selectedOrder.total?.toFixed(2) || '0.00'}
                  </div>
                  <div className="detail-item">
                    <strong>Method:</strong> {selectedOrder.paymentMethod || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Status:</strong> 
                    <span className={`status-badge ${selectedOrder.paymentStatus}`}>
                      {getPaymentIcon(selectedOrder.paymentStatus)} {selectedOrder.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>📦 Order Information</h3>
                  <div className="detail-item">
                    <strong>Status:</strong>
                    <span className={`status-badge ${selectedOrder.orderStatus}`}>
                      {getStatusIcon(selectedOrder.orderStatus)} {getDisplayStatus(selectedOrder.orderStatus, selectedOrder)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Created:</strong> {getOrderDate(selectedOrder.createdAt)}
                  </div>
                  <div className="detail-item">
                    <strong>Items:</strong> {selectedOrder.items?.length || 0} items
                  </div>
                </div>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="items-section">
                  <h3>🛍️ Order Items</h3>
                  <div className="items-list">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="item-card">
                        <div className="item-info">
                          <div className="item-name">{item.productName || 'Product'}</div>
                          <div className="item-details">
                            Size: {item.size || 'N/A'} | 
                            Color: {item.color || 'N/A'} | 
                            Quantity: {item.quantity || 1}
                          </div>
                          <div className="item-price">₱{(item.unitPrice || 0).toFixed(2)} each</div>
                        </div>
                        <div className="item-total">
                          ₱{((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isOrderAssetsEnabled && (
                <div className="assets-section">
                  <h3>📦 Order Assets</h3>
                  {loadingAssets ? (
                    <div className="loading-assets">
                      <p>Loading assets...</p>
                    </div>
                  ) : (
                    <div className="assets-list">
                      {/* CSV */}
                      <div className="asset-group">
                        <h4>CSV</h4>
                        <div className="asset-buttons">
                          <button
                            onClick={() => void downloadOrderCsv(selectedOrder)}
                            className="asset-download-button"
                          >
                            📄 Download Order CSV
                          </button>
                          {orderAssets && orderAssets.csvFiles.length > 0 && (
                            <>
                              {orderAssets.csvFiles.map((url, idx) => {
                                const storagePath = extractStoragePath(url);
                                const filename = storagePath?.split('/').pop() || `order-${selectedOrder.orderNumber}-${idx + 1}.csv`;
                                return (
                                  <button
                                    key={`csv-${idx}`}
                                    onClick={() => downloadImage(url, filename)}
                                    className="asset-download-button"
                                  >
                                    📄 Download {filename}
                                  </button>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mockup Images */}
                      <div className="asset-group">
                        <h4>Mockup Images</h4>
                        {orderAssets && orderAssets.mockups.length > 0 ? (
                          <div className="asset-buttons">
                            {orderAssets.mockups.map((url, idx) => (
                              <button
                                key={`mockup-${idx}`}
                                onClick={() => downloadImage(url, `mockup-${idx + 1}.png`)}
                                className="asset-download-button"
                              >
                                📥 Download Mockup {idx + 1}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="no-assets-message">No mockup images available for this order</p>
                        )}
                      </div>
                      
                      {/* Sticker Front Images */}
                      <div className="asset-group">
                        <h4>Sticker Front Images</h4>
                        {orderAssets && orderAssets.stickerFronts.length > 0 ? (
                          <div className="asset-buttons">
                            {orderAssets.stickerFronts.map((url, idx) => (
                              <button
                                key={`front-${idx}`}
                                onClick={() => downloadImage(url, `sticker-front-${idx + 1}.png`)}
                                className="asset-download-button"
                              >
                                📥 Download Front {idx + 1}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="no-assets-message">No sticker front images available for this order</p>
                        )}
                      </div>
                      
                      {/* Sticker Back Images */}
                      <div className="asset-group">
                        <h4>Sticker Back Images</h4>
                        {orderAssets && orderAssets.stickerBacks.length > 0 ? (
                          <div className="asset-buttons">
                            {orderAssets.stickerBacks.map((url, idx) => (
                              <button
                                key={`back-${idx}`}
                                onClick={() => downloadImage(url, `sticker-back-${idx + 1}.png`)}
                                className="asset-download-button"
                              >
                                📥 Download Back {idx + 1}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="no-assets-message">No sticker back images available for this order</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={closeOrderDetails} className="close-modal-button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

