import React, { useState, useEffect } from "react";
import { ShoppingBag, Star, TrendingUp, Filter, Search, Tag, ShoppingCart, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function ShopView() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('Product').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full pb-24 md:pb-10 h-full flex flex-col overflow-y-auto">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div></div>
        <div className="flex items-center gap-2">
           <button className="bg-brand-surface border border-brand-border hover:bg-brand-surface-light px-3 py-1.5 rounded font-medium transition-colors text-[13px] text-brand-text-primary shadow-sm flex items-center gap-1.5">
             <ShoppingCart className="w-4 h-4" /> 
             <span>Cart (0)</span>
           </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary" />
          <input 
            type="text" 
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#111] border border-brand-border rounded-md py-2 pl-9 pr-4 text-[13px] text-brand-text-primary focus:outline-none focus:border-brand-accent/50 transition-colors placeholder-[#666]"
          />
        </div>
        
        <div className="flex items-center gap-1 bg-[#212121] p-1 rounded-md border border-[rgba(255,255,255,0.05)] w-max overflow-x-auto hide-scrollbar">
            {["all", "equipment", "supplements", "apparel"].map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded text-[12px] font-medium transition-all capitalize whitespace-nowrap",
                  activeCategory === cat 
                    ? "bg-[#333] text-brand-text-primary shadow-sm" 
                    : "text-brand-text-secondary hover:text-brand-text-primary"
                )}
              >
                {cat}
              </button>
            ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map(product => (
          <div 
            key={product.id}
            className="bg-brand-surface border border-brand-border rounded-md overflow-hidden flex flex-col group hover:border-brand-accent/30 transition-colors shadow-sm cursor-pointer"
          >
            <div className={cn("h-40 w-full bg-gradient-to-br flex items-center justify-center relative", product.imageColor)}>
               <ShoppingBag className="w-10 h-10 text-white/20 group-hover:scale-110 transition-transform" />
               <div className="absolute top-2 left-2 flex flex-col gap-1">
                 {product.tags.map(tag => (
                   <span key={tag} className="text-[9px] font-semibold tracking-wider uppercase bg-brand-accent text-[#1e1e1e] px-1.5 py-0.5 rounded flex items-center gap-1 w-max">
                     <Tag className="w-2.5 h-2.5" /> {tag}
                   </span>
                 ))}
               </div>
            </div>
            
            <div className="p-4 flex flex-col flex-1">
               <div className="flex justify-between items-start mb-1">
                 <h3 className="text-[14px] font-semibold text-brand-text-primary line-clamp-1 flex-1">{product.name}</h3>
                 <span className="text-[13px] font-bold text-brand-accent ml-2">${product.price.toFixed(2)}</span>
               </div>
               
               <p className="text-[11px] text-brand-text-secondary uppercase tracking-wider mb-3 capitalize">{product.category}</p>
               
               <div className="mt-auto flex items-center justify-between">
                 <div className="flex items-center gap-1">
                   <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                   <span className="text-[12px] font-medium text-brand-text-primary">{product.rating}</span>
                   <span className="text-[11px] text-brand-text-secondary ml-1">({product.reviews})</span>
                 </div>
                 
                 <button className="w-8 h-8 rounded bg-[#1e1e1e] border border-brand-border flex items-center justify-center text-brand-text-primary hover:bg-[#333] hover:text-brand-accent transition-colors">
                   <Plus className="w-4 h-4" />
                 </button>
               </div>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-brand-text-secondary border border-dashed border-brand-border rounded-md">
            <ShoppingBag className="w-8 h-8 mb-3 opacity-20" />
            <p className="text-[13px]">No products found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
