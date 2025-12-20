import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const MAX_STORAGE = 1 * 1024 * 1024 * 1024; // 1 Go
const MAX_BANDWIDTH = 2 * 1024 * 1024 * 1024; // 2 Go

export default function Diaporama({ user, authUser }) {
  const currentUser = user || authUser;

  const [images, setImages] = useState([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [bandwidthUsed, setBandwidthUsed] = useState(0);
  const [uploading, setUploading] = useState(false);

  /* -----------------------------
     Chargement initial
  ------------------------------ */
  useEffect(() => {
    loadImages();
    loadStorageUsage();
    loadBandwidthUsage();
  }, []);

  /* -----------------------------
     Images
  ------------------------------ */
  const loadImages = async () => {
    const { data, error } = await supabase
      .storage
      .from("diaporama")
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (!error) setImages(data || []);
  };

  /* -----------------------------
     Stockage
  ------------------------------ */
  const loadStorageUsage = async () => {
    const { data } = await supabase
      .from("storage_files")
      .select("size");

    if (data) {
      const total = data.reduce((s, f) => s + (f.size || 0), 0);
      setStorageUsed(total);
    }
  };

  /* -----------------------------
     Bande passante (estimation)
  ------------------------------ */
  const loadBandwidthUsage = async () => {
    const { data } = await supabase
      .from("bandwidth_logs")
      .select("bytes");

    if (data) {
      const total = data.reduce((s, b) => s + (b.bytes || 0), 0);
      setBandwidthUsed(total);
    }
  };

  /* -----------------------------
     Upload image
  ------------------------------ */
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (storageUsed + file.size > MAX_STORAGE) {
      alert("❌ Stockage insuffisant");
      return;
    }

    setUploading(true);

    // ⚠️ PATH RELATIF AU BUCKET (PAS de "diaporama/")
    const filePath = `${Date.now()}-${file.name}`;
    console.log("UPLOAD PATH =", filePath);

    const { error } = await supabase.storage
      .from("diaporama")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (!error) {
      await supabase.from("storage_files").insert({
        bucket: "diaporama",
        path: filePath,
        size: file.size,
      });

      await loadImages();
      await loadStorageUsage();
    } else {
      console.error("Erreur upload:", error.message);
      alert("Erreur lors de l'upload");
    }

    setUploading(false);
  };

  /* -----------------------------
     Suppression image
  ------------------------------ */
  const deleteImage = async (path) => {
    if (!window.confirm("Supprimer cette image ?")) return;

    await supabase.storage.from("diaporama").remove([path]);
    await supabase.from("storage_files").delete().eq("path", path);

    await loadImages();
    await loadStorageUsage();
  };

  /* -----------------------------
     Log bande passante
  ------------------------------ */
  const logBandwidth = async (path, size) => {
    if (!size) return;

    await supabase.from("bandwidth_logs").insert({
      file_path: path,
      bytes: size,
    });
  };

  /* -----------------------------
     UI helpers
  ------------------------------ */
  const Bar = ({ used, max, label }) => {
    const percent = Math.min((used / max) * 100, 100);

    return (
      <div className="mb-4">
        <p className="font-semibold mb-1">{label}</p>
        <div className="w-full bg-gray-200 h-3 rounded">
          <div
            className={`h-3 rounded ${
              percent > 90 ? "bg-red-500" : "bg-blue-600"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs mt-1">
          {(used / 1024 / 1024).toFixed(1)} Mo /{" "}
          {(max / 1024 / 1024).toFixed(0)} Mo
        </p>
      </div>
    );
  };

  /* -----------------------------
     Render
  ------------------------------ */
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🖼️ Gestion du diaporama</h1>

      {/* Quotas */}
      <Bar label="Stockage" used={storageUsed} max={MAX_STORAGE} />
      <Bar
        label="Bande passante (estimée)"
        used={bandwidthUsed}
        max={MAX_BANDWIDTH}
      />

      {bandwidthUsed > MAX_BANDWIDTH * 0.9 && (
        <p className="text-red-600 text-sm mb-4">
          ⚠️ Bande passante bientôt dépassée
        </p>
      )}

      {/* Upload */}
      <div className="mb-6">
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>

      {/* Galerie */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((img) => {
          const path = img.name;

          const { publicUrl } = supabase
            .storage
            .from("diaporama")
            .getPublicUrl(path).data;

          return (
            <div
              key={img.name}
              className="relative border rounded overflow-hidden"
            >
              <img
                src={publicUrl}
                alt=""
                className="h-40 w-full object-cover"
                onLoad={() =>
                  logBandwidth(path, img.metadata?.size || 0)
                }
              />

              <button
                onClick={() => deleteImage(path)}
                className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded"
              >
                Supprimer
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
