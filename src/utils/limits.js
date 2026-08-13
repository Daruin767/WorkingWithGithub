// Helpers for limits: period start calculation and aggregation
export function periodStartFor(dateIso, period){
  const d = new Date(dateIso)
  if(period === 'daily'){
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
  }
  if(period === 'weekly'){
    // week starting Monday
    const day = d.getDay() || 7 // Sunday=0 -> 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day - 1))
    return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).toISOString()
  }
  if(period === 'biweekly'){
    // biweekly starting from 1st of month: week index
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    const diffDays = Math.floor((d - first) / (24*3600*1000))
    const startDay = diffDays < 14 ? 1 : 15
    return new Date(d.getFullYear(), d.getMonth(), startDay).toISOString()
  }
  if(period === 'monthly'){
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
  }
  // default to monthly
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

export function sumForPeriod(transactions, period, opts={category:null, user_id:null}){
  // filters transactions by same period start as now
  const now = new Date()
  const startIso = periodStartFor(now.toISOString(), period)
  const start = new Date(startIso)
  let end
  if(period === 'daily') end = new Date(start.getFullYear(), start.getMonth(), start.getDate()+1)
  else if(period === 'weekly') end = new Date(start.getFullYear(), start.getMonth(), start.getDate()+7)
  else if(period === 'biweekly') end = new Date(start.getFullYear(), start.getMonth(), start.getDate()+14)
  else if(period === 'monthly') end = new Date(start.getFullYear(), start.getMonth()+1, 1)
  else end = new Date(start.getFullYear(), start.getMonth()+1, 1)

  const filtered = transactions.filter(t=>{
    if(opts.user_id && t.user_id !== opts.user_id) return false
    if(opts.category && t.category !== opts.category) return false
    const date = new Date(t.date)
    return date >= start && date < end
  })
  const total = filtered.reduce((s,t)=> s + (Number(t.amount) || 0), 0)
  return { total, count: filtered.length }
}
