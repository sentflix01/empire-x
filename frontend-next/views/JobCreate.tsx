'use client'
import { useRouter } from 'next/navigation';
import React, { useState } from "react";
import { entities } from "@/api/entities";
import { useTranslation } from 'react-i18next';

import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ErrorBoundary from '@/components/ErrorBoundary';

const JOB_TYPES = ["full_time","part_time","contract","internship","freelance"];
const CATEGORIES = ["Technology","Design","Marketing","Sales","Finance","Education","Health","Operations","Other"];

function JobCreate() {
  const { t } = useTranslation();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title:"", description:"", requirements:"", location:"", is_remote:false,
    job_type:"full_time", salary_min:"", salary_max:"", currency:"ETB",
    category:"", deadline:""
  });

  const f = (k,v) => setForm(p => ({...p, [k]:v}));

  const handleSubmit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      await entities.Job.create({
        ...form,
        salary_min: form.salary_min ? parseFloat(form.salary_min) : null,
        salary_max: form.salary_max ? parseFloat(form.salary_max) : null,
        status:"open",
      });
      router.push("/jobs");
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  return (
      <div className="max-w-lg mx-auto">
        <button onClick={()=>router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4"/> Back
        </button>
        <div className="flex items-center gap-2 mb-6">
          <Briefcase className="w-6 h-6 text-amber-500"/>
          <h1 className="font-display text-2xl font-bold">Post a Job</h1>
        </div>
        <div className="space-y-4">
          <div><Label>Job Title</Label><Input value={form.title} onChange={e=>f("title",e.target.value)} placeholder="e.g. Senior React Developer" className="mt-1"/></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e=>f("description",e.target.value)} placeholder="Describe the role..." className="mt-1" rows={4}/></div>
          <div><Label>Requirements</Label><Textarea value={form.requirements} onChange={e=>f("requirements",e.target.value)} placeholder="List required skills..." className="mt-1" rows={3}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Job Type</Label>
              <Select value={form.job_type} onValueChange={v=>f("job_type",v)}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent>{JOB_TYPES.map(t=><SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v=>f("category",v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select"/></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="remote" checked={form.is_remote} onChange={e=>f("is_remote",e.target.checked)} className="w-4 h-4"/>
            <Label htmlFor="remote">Remote position</Label>
          </div>
          {!form.is_remote && <div><Label>Location</Label><Input value={form.location} onChange={e=>f("location",e.target.value)} placeholder="Addis Ababa" className="mt-1"/></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Min Salary (ETB)</Label><Input type="number" value={form.salary_min} onChange={e=>f("salary_min",e.target.value)} placeholder="Optional" className="mt-1"/></div>
            <div><Label>Max Salary (ETB)</Label><Input type="number" value={form.salary_max} onChange={e=>f("salary_max",e.target.value)} placeholder="Optional" className="mt-1"/></div>
          </div>
          <div><Label>Application Deadline</Label><Input type="date" value={form.deadline} onChange={e=>f("deadline",e.target.value)} className="mt-1"/></div>
          <Button onClick={handleSubmit} disabled={saving||!form.title} className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
            {saving?"Posting...":"Post Job"}
          </Button>
        </div>
      </div>
  );
}

export default function JobCreatePage() {
  return <ErrorBoundary><JobCreate /></ErrorBoundary>;
}
