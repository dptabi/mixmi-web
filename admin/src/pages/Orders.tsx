import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
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
import { formatDistanceToNow } from 'date-fns';
import TopBar from '../components/TopBar';
import './Orders.css';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: Timestamp | any; // Handle both Timestamp and other formats
  items: any[];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      setOrders(ordersData);
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

  const markAsPaid = async (orderId: string) => {
    if (!window.confirm('Mark this order as paid?')) return;
    
    try {
      // Get the order to check current status
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) {
        alert('Order not found');
        return;
      }

      const orderData = orderDoc.data();
      const currentStatus = orderData.orderStatus;
      
      // Update payment status and order status
      const updateData: any = {
        paymentStatus: 'paid',
        updatedAt: serverTimestamp()
      };

      // If order is still pending (unpaid), move it to confirmed (to_ship)
      if (currentStatus === 'pending') {
        updateData.orderStatus = 'confirmed';
        console.log('✅ Moving order from pending (to_pay) to confirmed (to_ship)');
      }

      await updateDoc(doc(db, 'orders', orderId), updateData);
      loadOrders();
      alert('✅ Order marked as paid and moved to "To Ship"!');
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to mark as paid');
    }
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

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setShowOrderDetails(false);
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
        <table className="orders-table">
          <thead>
            <tr>
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
              <tr key={order.id}>
                <td>
                  <strong>{order.orderNumber}</strong>
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
                    
                    {order.paymentStatus !== 'paid' && (
                      <button
                        onClick={() => markAsPaid(order.id)}
                        className="mark-paid-button"
                      >
                        💵 Mark Paid
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

