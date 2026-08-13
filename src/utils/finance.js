export function totalSaved(transactions){
  return transactions.reduce((s,t)=> s + (t.amount>0? t.amount : 0), 0)
}

export function totalSpent(transactions){
  return transactions.reduce((s,t)=> s + (t.amount<0? Math.abs(t.amount) : 0), 0)
}

export function totalsByKind(transactions){
  return transactions.reduce((acc,t)=>{
    acc[t.kind] = (acc[t.kind] || 0) + (t.amount<0? Math.abs(t.amount) : Math.max(0,t.amount))
    return acc
  }, {})
}
