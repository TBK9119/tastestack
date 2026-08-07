"use client";

import { useMemo } from "react";
import { type ProfileData } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Sector } from "recharts";
import { TYPE_ICONS } from "@/lib/constants";
import { motion } from "framer-motion";

const BRAND_COLORS = ["#7F77DD", "#AFA9EC", "#3C3489", "#C4C0F0", "#5A51B5", "#E2E0F8"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/90 backdrop-blur border p-3 rounded-lg shadow-xl text-sm font-semibold">
        <p className="text-muted-foreground mb-1">{payload[0].payload.name || `Rating ${label}`}</p>
        <p className="text-primary">{payload[0].value} titles</p>
      </div>
    );
  }
  return null;
};

export default function ProfileStats({ profile }: { profile: ProfileData }) {
  const ratingData = useMemo(() => {
    if (!profile.ratings) return [];
    return Array.from({ length: 10 }, (_, i) => ({
      rating: i + 1,
      count: profile.ratings[i + 1] || 0,
    }));
  }, [profile.ratings]);

  const mediaData = useMemo(() => {
    if (!profile.counts) return [];
    return Object.entries(profile.counts)
      .map(([type, count]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        type,
        value: count,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value); // largest first
  }, [profile.counts]);

  const totalRated = ratingData.reduce((acc, curr) => acc + curr.count, 0);
  const averageRating = totalRated > 0 
    ? (ratingData.reduce((acc, curr) => acc + curr.rating * curr.count, 0) / totalRated).toFixed(1)
    : "0.0";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid md:grid-cols-2 gap-6 mt-8"
    >
      {/* Rating Distribution */}
      <Card className="shadow-sm border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black tracking-tight">Rating Distribution</CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <p><strong className="text-foreground">{totalRated}</strong> rated</p>
            <p><strong className="text-foreground">{averageRating}</strong> average</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis 
                  dataKey="rating" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "#888888" }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "#888888" }} 
                />
                <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={1500}>
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 0 ? "#7F77DD" : "hsl(var(--muted))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Media Breakdown */}
      <Card className="shadow-sm border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black tracking-tight">Media Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{profile.totalItems}</strong> total tracked
          </p>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6">
          <div className="h-[200px] w-[200px] shrink-0 mt-4 sm:mt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mediaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1500}
                >
                  {mediaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full space-y-3">
            {mediaData.map((entry, i) => (
              <div key={entry.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: BRAND_COLORS[i % BRAND_COLORS.length] }} />
                  <span className="text-sm font-medium">{TYPE_ICONS[entry.type as keyof typeof TYPE_ICONS]} {entry.name}</span>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  {Math.round((entry.value / profile.totalItems) * 100)}%
                </div>
              </div>
            ))}
            {mediaData.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center w-full">No media tracked yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
