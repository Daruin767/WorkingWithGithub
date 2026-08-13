import React, { useState } from 'react'

function Sparkline({values, width=240, height=40, color='#2e7d32'}){
  const [tip, setTip] = useState(null)
  if(!values || values.length===0) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = width / (values.length - 1 || 1)
  const points = values.map((v,i)=> ({ x: i*step, y: height - ((v-min)/range)*height, v }))
  const d = 'M' + points.map(p=> `${p.x},${p.y}`).join(' L ')
  function onMove(e){
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const idx = Math.round((x / width) * (values.length - 1))
    const p = points[Math.max(0, Math.min(points.length-1, idx))]
    setTip({ x: p.x, y: p.y, v: p.v })
  }
  function onLeave(){ setTip(null) }
  return (
    <div style={{position:'relative'}}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} onMouseMove={onMove} onMouseLeave={onLeave}>
        <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {tip && (
        <div style={{position:'absolute',left: tip.x + 8, top: tip.y - 8, background:'rgba(2,6,23,0.9)',padding:6,border:'1px solid rgba(255,255,255,0.04)',borderRadius:6,fontSize:12,color:'var(--text)'}}>${tip.v.toFixed(2)}</div>
      )}
    </div>
  )
}

function CategoryBars({items, width=300, barHeight=18}){
  if(!items || items.length===0) return null
  const max = Math.max(...items.map(i=>Math.abs(i.value)))
  return (
    <div>
      {items.map(it=> (
        <div key={it.key} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <div style={{width:100,fontSize:12}}>{it.key}</div>
          <div style={{flex:1,background:'#eee',height:barHeight,borderRadius:6,overflow:'hidden'}}>
            <div style={{width:(Math.abs(it.value)/max*100)+'%',height:'100%',background: it.value<0? '#e53935' : '#2e7d32'}} />
          </div>
          <div style={{width:80,textAlign:'right',fontSize:12}}>${Math.abs(it.value).toFixed(2)}</div>
        </div>
      ))}
    </div>
  )
}

function MonthlyTrend({transactions, months=6, width=480, height=120}){
  // transactions: array with date ISO and amount
  if(!transactions) return null
  const now = new Date()
  const buckets = []
  for(let i=months-1;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
    const key = d.toISOString().slice(0,7)
    buckets.push({ key, total:0 })
  }
  for(const t of transactions){
    const k = new Date(t.date).toISOString().slice(0,7)
    const b = buckets.find(x=> x.key === k)
    if(b) b.total += Number(t.amount || 0)
  }
  const values = buckets.map(b=> b.total)
  const max = Math.max(...values.map(Math.abs)) || 1
  const stepX = width / (values.length - 1 || 1)
  const points = values.map((v,i)=> ({ x: i*stepX, y: height - ((v+max)/(2*max))*height, v }))
  const d = 'M' + points.map(p=> `${p.x},${p.y}`).join(' L ')
  const [tip, setTip] = useState(null)
  function onMove(e){
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const idx = Math.round((x / width) * (values.length - 1))
    const p = points[Math.max(0, Math.min(points.length-1, idx))]
    setTip({ x: p.x, y: p.y, v: p.v, label: buckets[idx].key })
  }
  function onLeave(){ setTip(null) }
  return (
    <div style={{position:'relative'}}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} onMouseMove={onMove} onMouseLeave={onLeave}>
        <path d={d} fill="none" stroke="#1976d2" strokeWidth={2} />
      </svg>
      {tip && (
        <div style={{position:'absolute',left: tip.x + 8, top: tip.y - 8, background:'rgba(2,6,23,0.9)',padding:6,border:'1px solid rgba(255,255,255,0.04)',borderRadius:6,fontSize:12,color:'var(--text)'}}>{tip.label}: ${tip.v.toFixed(2)}</div>
      )}
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginTop:6}}>
        {buckets.map(b=> <div key={b.key}>{b.key}</div>)}
      </div>
    </div>
  )
}

function exportSVGToPNG(svgEl, filename){
  try{
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svgEl)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const ratio = window.devicePixelRatio || 1
      const canvas = document.createElement('canvas')
      canvas.width = svgEl.clientWidth * ratio
      canvas.height = svgEl.clientHeight * ratio
      const ctx = canvas.getContext('2d')
      ctx.scale(ratio, ratio)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob)=>{
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
    }
    img.onerror = (e)=>{ console.error('svg->img error', e); URL.revokeObjectURL(url) }
    img.src = url
  }catch(e){ console.error('export failed', e) }
}

export default function Charts({transactions}){
  if(!transactions) return null
  // small aggregates
  const byCategory = {}
  const recent = transactions.slice().sort((a,b)=> new Date(a.date)-new Date(b.date)).slice(-12)
  const sparkValues = recent.map(r=> Number(r.amount || 0))
  for(const t of transactions){
    const cat = t.category || 'General'
    byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount || 0)
  }
  const items = Object.keys(byCategory).map(k=> ({ key:k, value: byCategory[k] }))
  items.sort((a,b)=> Math.abs(b.value) - Math.abs(a.value))

  function handleExportAll(){
    // export first svg elements inside this component
    const containerSvgs = document.querySelectorAll('[data-chart-root] svg')
    if(!containerSvgs || containerSvgs.length===0){
      alert('No hay gráficos disponibles para exportar')
      return
    }
    containerSvgs.forEach((svg, idx)=>{
      const name = `chart-${idx+1}.png`
      exportSVGToPNG(svg, name)
    })
  }

  function exportCardSVG(button, filename){
    try{
      const card = button.closest('[data-chart-card]')
      if(!card){ alert('No se encontró el gráfico'); return }
      const svg = card.querySelector('svg')
      if(!svg){ alert('El gráfico no está disponible'); return }
      exportSVGToPNG(svg, filename)
    }catch(e){ console.error(e); alert('Exportación fallida') }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
        <button className="nav-btn" onClick={handleExportAll}>Exportar gráficos (PNG)</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'320px 1fr',gap:16}} data-chart-root>
        <div data-chart-card style={{padding:12,borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.03)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h4 style={{marginTop:0,color:'var(--text)'}}>Tendencia reciente</h4>
            <button className="nav-btn" onClick={(e)=> exportCardSVG(e.currentTarget, 'tendencia-reciente.png')}>Exportar</button>
          </div>
          <Sparkline values={sparkValues} />
          <div style={{marginTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h5 style={{margin:'8px 0', color:'var(--text)'}}>Por categoría</h5>
              <button className="nav-btn" onClick={(e)=> exportCardSVG(e.currentTarget, 'por-categoria.png')}>Exportar</button>
            </div>
            <CategoryBars items={items.slice(0,6)} />
          </div>
        </div>
        <div data-chart-card style={{padding:12,borderRadius:10, background:'transparent', border:'1px solid rgba(255,255,255,0.03)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h4 style={{marginTop:0,color:'var(--text)'}}>Tendencia mensual</h4>
            <button className="nav-btn" onClick={(e)=> exportCardSVG(e.currentTarget, 'tendencia-mensual.png')}>Exportar</button>
          </div>
          <MonthlyTrend transactions={transactions} months={6} />
        </div>
      </div>
    </div>
  )
}
