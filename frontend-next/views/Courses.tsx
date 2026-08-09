'use client'
import Link from 'next/link';
import Image from 'next/image';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";

import { GraduationCap, Plus, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";
import ErrorBoundary from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORIES = ["All","Technology","Business","Design","Language","Health","Other"];

function Courses() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    entities.Course.filter({ is_published: true }, "-created_at", 50)
      .then(setCourses).finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || c.category === category;
    return matchSearch && matchCat;
  });

  return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Courses</h1>
            <p className="text-sm text-muted-foreground">Learn new skills</p>
          </div>
          <Link href="/courses/create">
            <Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
              <Plus className="w-4 h-4 mr-1"/> Create Course
            </Button>
          </Link>
        </div>

        <div className="relative mb-4">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('courses.title') + '...'} className="pl-9 rounded-full"/>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {CATEGORIES.map(c=>(
            <button key={c} onClick={()=>setCategory(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${category===c?"bg-amber-500 text-white":"bg-card border border-border/50 text-muted-foreground hover:bg-secondary"}`}>
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3"/>
            <p className="text-muted-foreground">No courses found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(course => (
              <Link key={course.id} href={`/courses/${course.id}`} className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-md transition-all group">
                <div className="h-36 bg-gradient-to-br from-amber-100 to-orange-100 relative overflow-hidden">
                  {course.cover_image
                    ? <Image src={course.cover_image} alt={course.title} fill className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                    : <div className="w-full h-full flex items-center justify-center"><GraduationCap className="w-12 h-12 text-amber-400"/></div>
                  }
                  {course.price > 0
                    ? <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-0">{course.price.toLocaleString()} {course.currency}</Badge>
                    : <Badge className="absolute top-2 right-2 bg-green-500 text-white border-0">Free</Badge>
                  }
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1">{course.title}</h3>
                  {course.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{course.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {course.level && <Badge variant="outline" className="text-[10px] capitalize">{course.level}</Badge>}
                    {course.category && <span>{course.category}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
  );
}

export default function CoursesPage() {
  return <ErrorBoundary><Courses /></ErrorBoundary>;
}
