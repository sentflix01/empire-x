'use client';
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import { Plus, MapPin, Clock, Banknote, ClipboardList, Gavel, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import BidModal from "@/components/tasks/BidModal";
import TaskBidsDialog from "@/components/tasks/TaskBidsDialog";
import { useTranslation } from "react-i18next";

const TASK_TYPES = {
  bill_payment: "💰 Bill Payment",
  document_pickup: "📄 Document Pickup",
  gov_form: "🏛️ Gov Form",
  delivery: "🚚 Delivery",
  queue_standing: "🧍 Queue Standing",
  grocery: "🛒 Grocery",
  other: "📋 Other",
};

const STATUS_STYLES = {
  open: "bg-green-50 text-green-700 border-green-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-secondary/50 text-muted-foreground border-border/50",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function Tasks() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [bids, setBids] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [user, setUser] = useState(null);
  const [bidTask, setBidTask] = useState(null);
  const [bidsViewTask, setBidsViewTask] = useState(null);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const [data, allBids] = await Promise.all([
      entities.Task.list("-created_at", 50),
      entities.TaskBid.list("-created_at", 200).catch(() => []),
    ]);
    setTasks(data);
    const bidsMap = {};
    allBids.forEach(b => {
      if (!bidsMap[b.task_id]) bidsMap[b.task_id] = [];
      bidsMap[b.task_id].push(b);
    });
    setBids(bidsMap);
    setLoading(false);
  };

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">{t('tasks.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('tasks.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tasks/calendar">
              <Button size="sm" variant="outline" className="rounded-full">
                <CalendarDays className="w-4 h-4 mr-1" /> {t('tasks.calendar')}
              </Button>
            </Link>
            <Link href="/tasks/create">
              <Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                <Plus className="w-4 h-4 mr-1" /> {t('tasks.postTask')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {["open", "in_progress", "done", "all"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === s ? "bg-amber-500 text-white" : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"
              }`}>
              {s === "all" ? t('tasks.all') : s === "in_progress" ? t('tasks.inProgress') : s === "open" ? t('tasks.open') : t('tasks.done')}
            </button>
          ))}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold">{t('tasks.noTasks')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('tasks.noTasksSubtitle')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(task => (
              <div key={task.id} className="bg-card rounded-2xl border border-border/50 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TASK_TYPES[task.task_type]?.split(" ")[0] || "📋"}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{task.title}</h3>
                      <p className="text-xs text-muted-foreground">{TASK_TYPES[task.task_type]?.split(" ").slice(1).join(" ")}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[task.status]}>{task.status}</Badge>
                </div>
                {task.description && <p className="text-sm text-muted-foreground mb-3">{task.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                  {task.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{task.location}</span>
                  )}
                  {task.deadline && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{moment(task.deadline).fromNow()}</span>
                  )}
                  <span className="flex items-center gap-1 text-amber-600 font-semibold">
                    <Banknote className="w-3 h-3" />{task.offered_payment?.toLocaleString()} {task.currency || "ETB"}
                  </span>
                </div>
                {task.status === "open" && task.requester_id !== user?.id && (
                  (bids[task.id] || []).some(b => b.bidder_id === user?.id) ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">{t('tasks.applied')}</Badge>
                  ) : (
                    <Button onClick={() => setBidTask(task)} size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600">
                      <Gavel className="w-4 h-4 mr-1" /> {t('tasks.applyBid')}
                    </Button>
                  )
                )}
                {task.status === "open" && task.requester_id === user?.id && (
                  <Button onClick={() => setBidsViewTask(task)} size="sm" variant="outline" className="rounded-full border-amber-300 text-amber-600 hover:bg-amber-50">
                    <Users className="w-4 h-4 mr-1" /> {t('tasks.viewBids')} ({(bids[task.id] || []).length})
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {bidTask && (
          <BidModal task={bidTask} user={user} onClose={() => setBidTask(null)} onPlaced={loadTasks} />
        )}
        {bidsViewTask && (
          <TaskBidsDialog
            task={bidsViewTask}
            user={user}
            bids={bids[bidsViewTask.id] || []}
            onClose={() => setBidsViewTask(null)}
            onAccepted={loadTasks}
          />
        )}
      </div>
  );
}



