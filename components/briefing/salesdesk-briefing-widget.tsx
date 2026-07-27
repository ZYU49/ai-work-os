"use client";

import Link from "next/link";
import { CalendarDays, ChevronDown, Megaphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  defaultBriefing,
  readBriefings,
  SALES_DESK_BRIEFING_UPDATED_EVENT,
  type BriefingEvent,
} from "@/services/briefing/local-store";

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function calendarDays(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay.getDay() }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  return [...blanks, ...days];
}

function eventDaySet(events: BriefingEvent[]) {
  return new Set(events.map((event) => new Date(event.createdAt).getDate()));
}

export function SalesDeskBriefingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<BriefingEvent[]>([]);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    function refresh() {
      setEvents(readBriefings(5));
      setNow(new Date());
    }

    refresh();
    window.addEventListener(SALES_DESK_BRIEFING_UPDATED_EVENT, refresh);

    return () => {
      window.removeEventListener(SALES_DESK_BRIEFING_UPDATED_EVENT, refresh);
    };
  }, []);

  const currentDate = useMemo(() => now ?? new Date(), [now]);
  const latest = events[0] ?? defaultBriefing(currentDate);
  const days = useMemo(() => calendarDays(currentDate), [currentDate]);
  const eventDays = useMemo(() => eventDaySet(events), [events]);

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[min(360px,calc(100vw-2rem))] md:left-[17rem]">
      {isOpen ? (
        <div className="mb-3 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-zinc-100 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
                ST
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  SalesDesk Briefing
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">Sutong reporter</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close briefing calendar"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            <section aria-label="Calendar">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <CalendarDays className="size-4" aria-hidden="true" />
                Calendar
              </div>
              <p className="mb-2 text-xs font-medium text-zinc-500">
                {monthLabel(currentDate)}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
                {days.map((day, index) =>
                  day === null ? (
                    <span key={`blank-${index}`} />
                  ) : (
                    <span
                      key={day}
                      className={`relative rounded-md py-1 tabular-nums ${
                        day === currentDate.getDate()
                          ? "bg-zinc-950 font-semibold text-white"
                          : "bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      {day}
                      {eventDays.has(day) ? (
                        <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-blue-500" />
                      ) : null}
                    </span>
                  ),
                )}
              </div>
            </section>

            <section>
              <p className="mb-2 text-sm font-semibold text-zinc-950">
                Recent updates
              </p>
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {(events.length > 0 ? events : [latest]).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <p className="text-sm font-medium text-zinc-950">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                      {event.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-500">
                        {timeLabel(event.createdAt)}
                      </span>
                      {event.href ? (
                        <Link
                          href={event.href}
                          className="text-[11px] font-medium text-zinc-950 underline-offset-4 hover:underline"
                        >
                          Open related page
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Open briefing calendar"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
          ST
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-zinc-500" aria-hidden="true" />
            <p className="truncate text-sm font-semibold text-zinc-950">
              SalesDesk Briefing
            </p>
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-zinc-700">
            {latest.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-500">
            {latest.message}
          </p>
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-zinc-500 transition ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
