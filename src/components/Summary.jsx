import React from 'react'

function TinyDonut({spent,saved}){
  const total = spent + saved || 1
  const spentPerc = Math.round((spent/total)*100)
  const savedPerc = 100 - spentPerc
  const r = 40
  const c = 2 * Math.PI * r
  const spentLen = Math.round((spentPerc/100)*c)
  const savedLen = c - spentLen
  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <g transform="translate(60,60)">
        <circle r={r} fill="#eee" />
        <circle r={r} fill="transparent" stroke="#e53935" strokeWidth={14} strokeDasharray={`${spentLen} ${savedLen}`} strokeDashoffset={0} strokeLinecap="round" transform={`rotate(-90)`} />
        <circle r={r} fill="transparent" stroke="#2e7d32" strokeWidth={14} strokeDasharray={`${savedLen} ${spentLen}`} strokeDashoffset={-spentLen} strokeLinecap="round" transform={`rotate(-90)`} />
        <text x="0" y="5" textAnchor="middle" fontSize="12" fill="#333">{savedPerc}%</text>
      </g>
    </svg>
  )
}

export default function Summary({transactions,totalSaved,totalSpent}){
  const fixed = transactions.filter(t=>t.kind==='fixed')
  const unexpected = transactions.filter(t=>t.kind==='unexpected')
  const fixedSum = fixed.reduce((s,t)=> s + (t.amount<0? Math.abs(t.amount): t.amount),0)
  const unexpectedSum = unexpected.reduce((s,t)=> s + (t.amount<0? Math.abs(t.amount): t.amount),0)

  return (
    <div style={{display:'flex',gap:16,alignItems:'center'}}>
      <div style={{flex:'0 0 320px',border:'1px solid #eee',padding:12,borderRadius:8}}>
        <h3 style={{marginTop:0}}>Resumen</h3>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:18,fontWeight:700}}>${totalSaved.toFixed(2)}</div>
            <div style={{color:'#666'}}>Ingresos/ahorros</div>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:700}}>${totalSpent.toFixed(2)}</div>
            <div style={{color:'#666'}}>Gastos</div>
          </div>
        </div>
        <div style={{marginTop:12,display:'flex',gap:8,alignItems:'center'}}>
          <TinyDonut spent={totalSpent} saved={totalSaved} />
          <div>
            <div><strong>Gasto fijo:</strong> ${fixedSum.toFixed(2)}</div>
            <div><strong>Gasto imprevisto:</strong> ${unexpectedSum.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={{flex:1,border:'1px solid #eee',padding:12,borderRadius:8}}>
        <h3 style={{marginTop:0}}>Accesos rápidos</h3>
        <ul>
          <li>Ver lista completa de gastos</li>
          <li>Crear meta de ahorro</li>
        </ul>
        <div style={{marginTop:8}}>
          <div style={{marginBottom:8}}><strong>Exportar transacciones:</strong></div>
          <div style={{display:'flex',gap:8}}>
            <button className="nav-btn" onClick={()=>import('../export').then(m=>m.exportJSON())}>JSON</button>
            <button className="nav-btn" onClick={()=>import('../export').then(m=>m.exportCSV())}>CSV</button>
            <button className="nav-btn" onClick={()=>import('../export').then(m=>m.exportXLSX())}>XLSX</button>
          </div>
        </div>
        <div style={{marginTop:8,color:'#666'}}>Usa los botones en la parte superior para navegar entre vistas.</div>
      </div>
    </div>
  )
}
