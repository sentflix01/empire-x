'use client'
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import { auth } from "@/api/auth";
import { entities } from "@/api/entities";
import { useTranslation } from 'react-i18next';

import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, Gavel, MapPin, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, isSameMonth, isSameDay, format
} from "date-fns";

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

export default function TaskCalendar() {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [bids, setBids] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [taskData, allBids] = await Promise.all([
      entities.Task.list("-created_at", 100),
      entities.TaskBid.list("-created_at", 200).catch(() => []),
    ]);
    setTasks(taskData);
    const bidsMap = {};
    allBids.forEach(b => {
      if (!bidsMap[b.task_id]) bidsMap[b.task_id] = [];
      bidsMap[b.task_id].push(b);
    });
    setBids(bidsMap);
    setLoading(false);
  };

  // Build timeline items: task deadlines + bidding deadlines (for open tasks with bids)
  const timelineItems = tasks
    .filter(t => t.deadline)
    .map(t => {
      const taskBids = bids[t.id] || [];
      const hasPendingBids = taskBids.some(b => b.status === "pending");
      const items = [];
      // Task deadline
      items.push({
        date: new Date(t.deadline),
        type: "deadline",
        task: t,
        label: t.title,
        pendingBids: hasPendingBids ? taskBids.filter(b => b.status === "pending").length : 0,
      });
      return items;
    })
    .flat();

  const itemsByDate = {};
  timelineItems.forEach(item => {
    const key = format(item.date, "yyyy-MM-dd");
    if (!itemsByDate[key]) itemsByDate[key] = [];
    itemsByDate[key].push(item);
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const prevMonth = () => setCurrentMonth(addMonths(currentMonth, -1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToday = () => { setCurrentMonth(new Date()); setSelectedDate(new Date()); };

  const today = new Date();
  const selectedDayItems = selectedDate ? (itemsByDate[format(selectedDate, "yyyy-MM-dd")] || []) : [];

  return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-amber-500" /> Task Calendar
            </h1>
            <p className="text-sm text-muted-foreground">Scheduled errands & bidding deadlines</p>
          </div>
          <Link href="/tasks">
            <Button size="sm" variant="outline" className="rounded-full">
              Board View
            </Button>
          </Link>
        </div>

        {/* Calendar Header */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={goToday} className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/70 transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(d => {
                const dateKey = format(d, "yyyy-MM-dd");
                const dayItems = itemsByDate[dateKey] || [];
                const inMonth = isSameMonth(d, currentMonth);
                const isToday = isSameDay(d, today);
                const isSelected = selectedDate && isSameDay(d, selectedDate);

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(d)}
                    className={`relative min-h-[52px] sm:min-h-[64px] rounded-lg p-1 text-left transition-all border ${
                      isSelected ? "border-amber-400 bg-amber-50" :
                      isToday ? "border-amber-300 bg-amber-50/50" :
                      inMonth ? "border-border/30 hover:border-amber-200" :
                      "border-transparent opacity-40"
                    }`}
                  >
                    <span className={`text-xs font-medium ${isToday ? "text-amber-600 font-bold" : inMonth ? "text-foreground" : "text-muted-foreground"}`}>
                      {format(d, "d")}
                    </span>
                    {dayItems.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayItems.slice(0, 2).map((item, i) => (
                          <div
                            key={i}
                            className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate ${
                              item.task.status === "open" ? "bg-green-100 text-green-700" :
                              item.task.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                              item.task.status === "done" ? "bg-secondary text-muted-foreground" :
                              "bg-red-100 text-red-600"
                            }`}
                          >
                            {TASK_TYPES[item.task.task_type]?.split(" ")[0] || "📋"} {item.label}
                          </div>
                        ))}
                        {dayItems.length > 2 && (
                          <div className="text-[9px] text-muted-foreground px-1">+{dayItems.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Day Timeline */}
        {selectedDate && (
          <div className="bg-card rounded-2xl border border-border/50 p-4 mb-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              {format(selectedDate, "EEEE, MMMM d")}
              <Badge variant="outline" className="text-[10px]">{selectedDayItems.length} {selectedDayItems.length === 1 ? "item" : "items"}</Badge>
            </h3>
            {selectedDayItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No scheduled errands or deadlines on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/40 hover:border-amber-200 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-lg">
                      {TASK_TYPES[item.task.task_type]?.split(" ")[0] || "📋"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium truncate">{item.task.title}</h4>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_STYLES[item.task.status]}`}>{item.task.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {TASK_TYPES[item.task.task_type]?.split(" ").slice(1).join(" ")} • Due {moment(item.task.deadline).format("h:mm A")}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                        {item.task.location && (
                          <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{item.task.location}</span>
                        )}
                        <span className="flex items-center gap-1 text-amber-600 font-semibold">
                          <Banknote className="w-3 h-3" />{item.task.offered_payment?.toLocaleString()} {item.task.currency || "ETB"}
                        </span>
                        {item.pendingBids > 0 && (
                          <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            <Gavel className="w-3 h-3" />{item.pendingBids} pending {item.pendingBids === 1 ? "bid" : "bids"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Timeline */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <h3 className="font-semibold text-sm mb-3">Upcoming Deadlines</h3>
          {timelineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines.</p>
          ) : (
            <div className="space-y-2">
              {timelineItems
                .filter(item => item.date >= today)
                .sort((a, b) => a.date - b.date)
                .slice(0, 5)
                .map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/30 transition-colors">
                    <div className="text-center shrink-0 w-12">
                      <p className="text-[10px] text-muted-foreground uppercase">{format(item.date, "MMM")}</p>
                      <p className="text-lg font-bold text-amber-600">{format(item.date, "d")}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.task.title}</p>
                      <p className="text-xs text-muted-foreground">{moment(item.date).fromNow()}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_STYLES[item.task.status]}`}>{item.task.status}</Badge>
                  </div>
                ))}
            </div>
          )}
          <Link href="/tasks/create" className="mt-3 block">
            <Button size="sm" variant="outline" className="w-full rounded-full">
              <Plus className="w-4 h-4 mr-1" /> Schedule a Task
            </Button>
          </Link>
        </div>
      </div>
  );
}



