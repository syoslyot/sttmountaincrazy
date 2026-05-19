'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (date: string) => void
  placeholder?: string
}

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

function generateDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function HangbaoDatePicker({ value, onChange, placeholder = '選擇日期' }: Props) {
  const today = new Date()
  const parsed = value ? new Date(value) : null

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : today.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      const d = new Date(value)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (day: number) => {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`)
    setOpen(false)
  }

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const displayValue = value ? value.replace(/-/g, '.') : placeholder
  const days = generateDays(viewYear, viewMonth)

  return (
    <div className="hb-datepicker" ref={ref}>
      <button
        type="button"
        className={`hb-datepicker-btn${value ? ' has-value' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {displayValue}
        <span className="hb-datepicker-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="hb-cal">
          <div className="hb-cal-header">
            <button type="button" className="hb-cal-nav" onClick={prevMonth}>◀</button>
            <span className="hb-cal-title">{viewYear}年 {pad(viewMonth + 1)}月</span>
            <button type="button" className="hb-cal-nav" onClick={nextMonth}>▶</button>
          </div>

          <div className="hb-cal-daynames">
            {DAY_NAMES.map(n => <span key={n}>{n}</span>)}
          </div>

          <div className="hb-cal-grid">
            {days.map((day, i) => {
              if (day === null) return <span key={i} className="hb-cal-day empty" />
              const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`
              const isSelected = dateStr === value
              const isToday = dateStr === todayStr
              return (
                <button
                  key={i}
                  type="button"
                  className={`hb-cal-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
