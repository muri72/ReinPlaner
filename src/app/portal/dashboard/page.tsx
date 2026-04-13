"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { MobileDashboardLayout } from "@/components/mobile-dashboard-layout";
import { MobileOrderCard } from "@/components/mobile-order-card";
import { MobileQuickActions } from "@/components/mobile-quick-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  Star, 
  FileText, 
  Plus,
  Filter,
  Search
} from "lucide-react";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";

interface Order {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  order_type: string;
  service_type: string | null;
  customer_name: string | null;
  object_name: string | null;
  employee_names: string[] | null;
  notes: string | null;
  customer_notes: string | null;
  order_feedback?: {
    rating: number;
    comment: string;
  } | null;
}

export default function CustomerDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirect("/");
        return;
      }
      setCurrentUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, role')
        .eq('id', user.id)
        .single();
      setUserProfile(profile);
    };

    const fetchOrders = async () => {
      if (!currentUser) return;

      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          id,
          title,
          status,
          priority,
          start_date,
          end_date,
          order_type,
          service_type,
          customer_notes,
          order_feedback(rating, comment)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      // Transform data to match Order interface
      const transformedOrders: Order[] = (orderData || []).map((order: any) => ({
        ...order,
        customer_name: null, // Customer doesn't need customer_name for their own orders
        object_name: null,
        employee_names: null,
        notes: order.customer_notes,
      }));

      setOrders(transformedOrders);
      setFilteredOrders(transformedOrders);
      setLoading(false);
    };

    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.service_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const handleNewBooking = () => {
    // Navigate to new booking form
    console.log('New booking');
  };

  const handleFeedback = (orderId: string) => {
    // Navigate to feedback form
    console.log('Feedback for order:', orderId);
  };

  const handleViewDetails = (order: Order) => {
    // Navigate to order details
    console.log('View details for order:', order);
  };

  return (
    <MobileDashboardLayout
      onSignOut={async () => {
        await supabase.auth.signOut();
        redirect("/");
      }}
    >
      <div className="space-y-4">
        {/* Welcome Header */}
        <Card className="glassmorphism-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              Willkommen, {userProfile?.first_name || 'Kunde'}!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <MobileQuickActions
          notificationCount={0}
          pendingTasksCount={0}
        />

        {/* Search and Filter */}
        <Card className="glassmorphism-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Meine Buchungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buchungen suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
            
            <div className="flex space-x-2 overflow-x-auto">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Alle
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Ausstehend
              </Button>
              <Button
                variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('in_progress')}
              >
                Aktiv
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('completed')}
              >
                Abgeschlossen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary border-r-transparent border-t-transparent"></div>
              <p className="mt-2 text-muted-foreground">Lade Buchungen...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="glassmorphism-card">
              <CardContent className="text-center py-8">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold">Keine Buchungen gefunden</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Keine Ergebnisse für Ihre Suche' : 'Sie haben noch keine Buchungen'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <MobileOrderCard
                key={order.id}
                order={order}
                onStatusChange={(orderId, newStatus) => {
                  console.log('Status change:', orderId, newStatus);
                }}
                onEdit={() => handleViewDetails(order)}
                onContact={() => console.log('Contact for order:', order.id)}
                onViewDetails={() => handleViewDetails(order)}
              />
            ))
          )}
        </div>

        {/* Quick Actions Footer */}
        <div className="fixed bottom-20 left-4 right-4 z-30">
          <Button
            onClick={handleNewBooking}
            className="w-full h-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Neue Buchung</span>
          </Button>
        </div>
      </div>
    </MobileDashboardLayout>
  );
}