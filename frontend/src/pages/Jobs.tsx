// @ts-nocheck
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import client from "@/api/client";
import { Link } from "react-router-dom";
import { Briefcase, MapPin, Plus, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import moment from "moment";

const JOB_TYPE_LABELS = {
  full_time: "Full Time", part_time: "Part Time", contract: "Contract",
  internship: "Internship", freelance: "Freelance"
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    entities.Job.filter({ status: "open" }, "-created_at", 50)
      .then(setJobs).finally(() => setLoading(false));
  }, []);

  const handleApply = async (job) => {
    if (!user) return;
    setApplying(job.id);
    try {
      await client.post(`/api/jobs/${job.id}/apply`, { cover_letter: "" });
      toast.success("Application submitted! ✅");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Application failed");
    }
    setApplying(null);
  };

  const filtered = jobs.filter(j =>
    !search || j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Jobs</h1>
            <p className="text-sm text-muted-foreground">Find your next opportunity</p>
          </div>
          <Link to="/jobs/create">
            <Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
              <Plus className="w-4 h-4 mr-1" /> Post Job
            </Button>
          </Link>
        </div>

        <div className="relative mb-4">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." className="pl-9 rounded-full" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground">No jobs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => (
              <div key={job.id} className="bg-card rounded-2xl border border-border/50 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base">{job.title}</h3>
                    {job.category && <p className="text-xs text-muted-foreground">{job.category}</p>}
                  </div>
                  <Badge variant="outline" className="shrink-0 ml-2 text-[10px]">{JOB_TYPE_LABELS[job.job_type]}</Badge>
                </div>
                {job.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                  {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                  {job.is_remote && <span className="flex items-center gap-1"><span>🌐</span> Remote</span>}
                  {job.salary_min && <span className="flex items-center gap-1 text-amber-600 font-semibold"><DollarSign className="w-3 h-3" />{job.salary_min.toLocaleString()}{job.salary_max ? `–${job.salary_max.toLocaleString()}` : "+"} {job.currency}</span>}
                  {job.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Deadline: {moment(job.deadline).fromNow()}</span>}
                </div>
                {user && job.poster_id !== user.id && (
                  <Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600"
                    disabled={applying === job.id} onClick={() => handleApply(job)}>
                    {applying === job.id ? "Applying..." : "Apply Now"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
  );
}


