'use client'
import React from "react";
import { useTranslation } from 'react-i18next';
import { LucideProps } from "lucide-react";

interface StatCardProps {
  icon: React.ComponentType<LucideProps>;
  label: string;
  value: string | number;
  color: string;
  trend?: number;
}

export default function StatCard({ icon: Icon, label, value, color, trend }: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
