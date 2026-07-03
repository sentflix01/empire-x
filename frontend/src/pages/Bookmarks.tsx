// @ts-nocheck
import React, { useState, useEffect } from "react";
import client from "@/api/client";
import { entities } from "@/api/entities";
import { Link } from "react-router-dom";
import { Bookmark, ShoppingBag, Crown, ClipboardList, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = [
  { key:"all", label:"All" },
  { key:"post", label:"Posts", icon:FileText },
  { key:"product", label:"Products", icon:ShoppingBag },
  { key:"showroom", label:"Showrooms", icon:Crown },
  { key:"task", label:"Tasks", icon:ClipboardList },
];

export default function Bookmarks() {
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [enriched, setEnriched] = useState([]);

  useEffect(() => {
    client.get("/api/saves").then(async r => {
      setSaves(r.data);
      // Enrich with actual data
      const items = await Promise.all(r.data.map(async s => {
        try {
          let item;
          if (s.target_type === "post") item = await entities.Post.get(s.target_id);
          else if (s.target_type === "product") item = await entities.Product.get(s.target_id);
          else if (s.target_type === "showroom") item = await entities.Showroom.get(s.target_id);
          else if (s.target_type === "task") item = await entities.Task.get(s.target_id);
          return { ...s, item };
        } catch { return { ...s, item: null }; }
      }));
      setEnriched(items.filter(i => i.item));
    }).finally(() => setLoading(false));
  }, []);

  const handleUnsave = async (targetId) => {
    await client.post("/api/saves/toggle", { target_id: targetId });
    setEnriched(prev => prev.filter(s => s.target_id !== targetId));
  };

  const filtered = tab === "all" ? enriched : enriched.filter(s => s.target_type === tab);

  return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="w-6 h-6 text-amber-500"/>
          <h1 className="font-display text-2xl font-bold">Bookmarks</h1>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${tab===t.key?"bg-amber-500 text-white":"bg-card border border-border/50 text-muted-foreground hover:bg-secondary"}`}>
              {t.icon && <t.icon className="w-3.5 h-3.5"/>}{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3"/>
            <p className="text-muted-foreground">No bookmarks yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const { item, target_type, target_id } = s;
              return (
                <div key={target_id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {target_type === "post" && (
                      <p className="text-sm line-clamp-2">{item.content}</p>
                    )}
                    {target_type === "product" && (
                      <Link to={`/products/${item.id}`} className="hover:underline">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-amber-600">{item.price?.toLocaleString()} {item.currency}</p>
                      </Link>
                    )}
                    {target_type === "showroom" && (
                      <Link to={`/showrooms/${item.id}`} className="hover:underline">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </Link>
                    )}
                    {target_type === "task" && (
                      <Link to="/tasks" className="hover:underline">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-amber-600">{item.offered_payment?.toLocaleString()} {item.currency}</p>
                      </Link>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 capitalize">{target_type}</p>
                  </div>
                  <button onClick={()=>handleUnsave(target_id)} className="text-muted-foreground hover:text-amber-500 transition-colors shrink-0">
                    <Bookmark className="w-4 h-4 fill-amber-500 text-amber-500"/>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}


