"use client";

import React, { useState } from "react";

interface SendToWhatsAppModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  userToken: string; // Firebase Auth ID Token for API authorization
}

export default function SendToWhatsAppModal({
  productId,
  productName,
  isOpen,
  onClose,
  userToken,
}: SendToWhatsAppModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bodyText, setBodyText] = useState(`Check out this product: ${productName}`);
  const [footerText, setFooterText] = useState("Available now");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // 1. Sync product to Meta Catalog first to ensure it's up to date
      await fetch("/api/meta/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ productId }),
      });

      // 2. Send the WhatsApp message
      const response = await fetch("/api/meta/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          phoneNumber,
          productId,
          bodyText,
          footerText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.error || "Failed to send WhatsApp message");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Send to WhatsApp</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>

        {success ? (
          <div className="p-4 bg-green-50 text-green-700 rounded-md">
            Product sent successfully!
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (with country code, no +)
              </label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="2547XXXXXXXX"
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Body
              </label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Footer Text (Optional)
              </label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
              />
            </div>

            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send WhatsApp"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
