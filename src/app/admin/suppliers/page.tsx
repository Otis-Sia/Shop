"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import Icon from "@/components/Icon";
import { useToast } from "@/components/providers/ToastProvider";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  whatsapp_number: string;
  location: string;
  created_at?: string;
  updated_at?: string;
}

export default function AdminSuppliers() {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Supplier>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      
      const res = await fetch("/api/admin/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch suppliers");
      
      setSuppliers(data.suppliers || []);
    } catch (error: any) {
      console.error(error);
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchSuppliers();
    } else {
      const unsub = auth.onAuthStateChanged((user) => {
        if (user) fetchSuppliers();
      });
      return () => unsub();
    }
  }, []);

  const handleEdit = (supplier: Supplier) => {
    setEditForm(supplier);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setEditForm({ name: "", whatsapp_number: "", location: "" });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name) {
      showToast("Supplier name is required", "error");
      return;
    }
    
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      const token = await user.getIdToken();
      
      const isNew = !editForm.id;
      const url = isNew ? "/api/admin/suppliers" : `/api/admin/suppliers/${editForm.id}`;
      const method = isNew ? "POST" : "PUT";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save supplier");
      
      showToast(`Supplier ${isNew ? "created" : "updated"} successfully`, "success");
      setIsEditing(false);
      fetchSuppliers(); // Refresh list
    } catch (error: any) {
      console.error(error);
      showToast(error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete supplier");
      }
      
      showToast("Supplier deleted", "success");
      setSuppliers(suppliers.filter((s) => s.id !== id));
    } catch (error: any) {
      console.error(error);
      showToast(error.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-on-surface border-t-primary-container rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md font-black text-3xl tracking-tight text-on-surface uppercase">
            Suppliers
          </h1>
          <p className="text-secondary font-bold">
            Manage your dropship and wholesale suppliers
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-primary-container text-on-surface border-4 border-on-surface px-6 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_var(--color-on-surface)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-on-surface)] transition-all flex items-center gap-2 w-fit"
        >
          <Icon name="add" />
          Add Supplier
        </button>
      </div>
      
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface border-4 border-on-surface p-6 shadow-[8px_8px_0px_0px_var(--color-on-surface)] max-w-md w-full relative">
            <h2 className="font-bold text-xl uppercase mb-4 border-b-2 border-on-surface/20 pb-2">
              {editForm.id ? "Edit Supplier" : "Add Supplier"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border-2 border-on-surface p-2 text-sm bg-surface font-bold"
                  placeholder="e.g. Acme Wholesale"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={editForm.whatsapp_number || ""}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp_number: e.target.value })}
                  className="w-full border-2 border-on-surface p-2 text-sm bg-surface font-bold"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Location</label>
                <input
                  type="text"
                  value={editForm.location || ""}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full border-2 border-on-surface p-2 text-sm bg-surface font-bold"
                  placeholder="City, Country"
                />
              </div>
              
              <div className="flex gap-3 justify-end pt-4 border-t-2 border-on-surface/20">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border-2 border-on-surface font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary-container text-on-surface border-2 border-on-surface font-bold uppercase text-xs disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-surface border-4 border-on-surface overflow-x-auto shadow-[4px_4px_0px_0px_var(--color-on-surface)]">
        <table className="w-full text-left border-collapse min-w-[750px]">
          <thead>
            <tr className="bg-on-surface text-surface uppercase font-bold text-xs tracking-wider">
              <th className="p-4 border-b-4 border-on-surface">Name</th>
              <th className="p-4 border-b-4 border-on-surface">WhatsApp</th>
              <th className="p-4 border-b-4 border-on-surface">Location</th>
              <th className="p-4 border-b-4 border-on-surface text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center font-bold text-secondary">
                  No suppliers found.
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b border-on-surface hover:bg-surface-dim transition-colors">
                  <td className="p-4 font-bold">{supplier.name}</td>
                  <td className="p-4 font-mono text-sm">{supplier.whatsapp_number || "-"}</td>
                  <td className="p-4">{supplier.location || "-"}</td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/admin/products?supplier=${encodeURIComponent(supplier.name)}`}
                        className="text-xs border-2 border-on-surface bg-surface text-on-surface px-2.5 py-1 font-bold shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                      >
                        View Products
                      </Link>
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="text-xs border-2 border-on-surface bg-primary-container text-on-surface px-2.5 py-1 font-bold shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="text-xs border-2 border-error text-error px-2.5 py-1 font-bold shadow-[2px_2px_0px_0px_var(--color-on-surface)]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
