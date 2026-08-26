'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from 'next/navigation';
import { entities } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import client from "@/api/client";

import { ArrowLeft, GraduationCap, Play, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ErrorBoundary from '@/components/ErrorBoundary';

function CourseDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [c, { data: enr }] = await Promise.all([
          entities.Course.get(String(id)),
          client.get(`/api/courses/${id}/enrolled`).catch(() => ({ data: { enrolled: false } })),
        ]);
        setCourse(c);
        setEnrollment(enr.enrolled ? enr.enrollment : null);
        if ((c as any)?.lessons?.length) setActiveLesson((c as any).lessons[0]);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user?.id]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await client.post(`/api/courses/${id}/enroll`);
      const { data } = await client.get(`/api/courses/${id}/enrolled`);
      setEnrollment(data.enrollment);
    } catch (e) { toast.error(e?.response?.data?.error || "Enrollment failed"); }
    setEnrolling(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"/></div>;
  if (!course) return <div className="text-center py-20">Course not found</div>;

  const isEnrolled = !!enrollment;
  const isFree = course.price === 0;
  const canAccess = isEnrolled || isFree;

  return (
    <div className="max-w-3xl mx-auto">
        <button onClick={()=>router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4"/> Back
        </button>

        {/* Header */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden mb-4">
          <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-100 relative">
            {course.cover_image && <img loading="lazy" src={course.cover_image} alt={course.title} className="w-full h-full object-cover"/>}
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between mb-2">
              <h1 className="font-display text-xl font-bold">{course.title}</h1>
              {course.price > 0
                ? <Badge className="bg-amber-500 text-white border-0 shrink-0 ml-2">{course.price.toLocaleString()} {course.currency}</Badge>
                : <Badge className="bg-green-500 text-white border-0 shrink-0 ml-2">Free</Badge>
              }
            </div>
            {course.description && <p className="text-sm text-muted-foreground mb-3">{course.description}</p>}
            <div className="flex gap-2 mb-4">
              {course.level && <Badge variant="outline" className="capitalize text-[10px]">{course.level}</Badge>}
              {course.category && <Badge variant="outline" className="text-[10px]">{course.category}</Badge>}
              <Badge variant="outline" className="text-[10px]">{course.lessons?.length || 0} lessons</Badge>
            </div>
            {isEnrolled ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <span className="text-xs font-medium">{enrollment.progress}%</span>
                </div>
                <Progress value={enrollment.progress} className="h-2"/>
              </div>
            ) : (
              <Button onClick={handleEnroll} disabled={enrolling} className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
                {enrolling ? "Enrolling..." : isFree ? "Enroll Free" : `Enroll for ${course.price.toLocaleString()} ${course.currency}`}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lessons list */}
          <div className="md:col-span-1">
            <h2 className="font-semibold text-sm mb-3">Lessons ({course.lessons?.length || 0})</h2>
            <div className="space-y-1">
              {(course.lessons || []).map((lesson, i) => {
                const accessible = canAccess || lesson.is_free;
                return (
                  <button key={lesson.id} onClick={() => accessible && setActiveLesson(lesson)}
                    className={`w-full flex items-center gap-2 p-3 rounded-xl text-left transition-colors ${activeLesson?.id === lesson.id ? "bg-amber-50 border border-amber-200" : "hover:bg-secondary/50"} ${!accessible ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${activeLesson?.id === lesson.id ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"}`}>{i+1}</div>
                    <span className="text-xs flex-1 truncate">{lesson.title}</span>
                    {!accessible ? <Lock className="w-3 h-3 text-muted-foreground shrink-0"/> : <Play className="w-3 h-3 text-muted-foreground shrink-0"/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Video player */}
          <div className="md:col-span-2">
            {activeLesson ? (
              <div className="bg-card rounded-2xl border border-border/50 p-4">
                <h3 className="font-semibold mb-3">{activeLesson.title}</h3>
                {activeLesson.video_url ? (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden mb-3">
                    <video src={activeLesson.video_url} controls className="w-full h-full"/>
                  </div>
                ) : (
                  <div className="aspect-video bg-secondary/30 rounded-xl flex items-center justify-center mb-3">
                    <GraduationCap className="w-12 h-12 text-muted-foreground/30"/>
                  </div>
                )}
                {activeLesson.description && <p className="text-sm text-muted-foreground">{activeLesson.description}</p>}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
                <GraduationCap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3"/>
                <p className="text-sm text-muted-foreground">Select a lesson to start learning</p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default function CourseDetailPage() {
  return <ErrorBoundary><CourseDetail /></ErrorBoundary>;
}
