'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Upload, Download, Search, Filter, Loader2, AlertCircle, CheckCircle2, XCircle, FileText, Trash2, Edit, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TierGatedSection } from '@/components/subscription/TierGatedSection';
import { UpgradePromptModal } from '@/components/subscription/UpgradePromptModal';
import { format } from 'date-fns';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  stock: number;
  min_stack: number;
  images?: string;
  category?: string;
  status: string;
  sku?: string;
  created_at: string;
  updated_at: string;
}

interface BulkImportResult {
  created: number;
  errors: Array<{ index: number; reason: string; data: any }>;
}

interface ProductFormData {
  title: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  min_stack: number;
  category: string;
  sku: string;
  status: string;
}

export default function BusinessInventoryDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: any[] } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    price: number;
    currency: string;
    stock: number;
    min_stack: number;
    category: string;
    sku: string;
    status: string;
  }>({
    title: '',
    description: '',
    price: 0,
    currency: 'ETB',
    stock: 0,
    min_stack: 10,
    category: '',
    sku: '',
    status: 'active',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const currencies = ['ETB', 'USD', 'EUR', 'KES', 'NGN', 'GHS', 'ZAR'];
  const statuses = ['active', 'sold_out', 'draft', 'archived'];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?limit=500', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/products/bulk-import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await res.json();
      if (res.ok) {
        setImportResult(result);
        fetchProducts();
        setImportDialogOpen(false);
        setImportFile(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Import failed');
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        fetchProducts();
        setEditDialogOpen(false);
        setEditingProduct(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update product');
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProductId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/products/${deletingProductId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        fetchProducts();
        setDeleteDialogOpen(false);
        setDeletingProductId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete product');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description || '',
      price: product.price,
      currency: product.currency,
      stock: product.stock,
      min_stack: product.min_stack || 10,
      category: product.category || '',
      sku: product.sku || '',
      status: product.status,
    });
    setEditDialogOpen(true);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'ETB' ? 'ETB' : currency,
      minimumFractionDigits: currency === 'ETB' ? 0 : 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      sold_out: 'destructive',
      draft: 'secondary',
      archived: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog, track inventory, and bulk import products.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setImportDialogOpen(true)} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import (CSV/JSON)
          </Button>
          <Button variant="outline" onClick={() => {
            setEditingProduct(null);
            setFormData({ title: '', description: '', price: 0, currency: 'ETB', stock: 0, min_stack: 10, category: '', sku: '', status: 'active' });
            setEditDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="text-center py-12 text-gray-500">
        <p>BusinessInventoryDashboard component - implementation in progress</p>
        <p className="text-sm text-gray-400 mt-2">TypeScript errors being resolved</p>
      </div>
    </div>
  );
}
