import React, { useState } from 'react'

export default function TransactionList({transactions, onEdit, onDelete}){
  const [editingId, setEditingId] = useState(null)

  if(!transactions || transactions.length===0) return <div>No hay transacciones</div>
  return (
    <div>
      <table border="1" cellPadding="6" style={{width:'100%',marginTop:8}}>
        <thead><tr><th>Fecha</th><th>Monto</th><th>Tipo</th><th>Categoría</th><th></th></tr></thead>
        <tbody>
          {transactions.map(t=> (
            <tr key={t.id}>
              <td>{new Date(t.date).toLocaleString()}</td>
              <td>{t.amount}</td>
              <td>{t.kind}</td>
              <td>{t.category}</td>
              <td style={{whiteSpace:'nowrap'}}>
                <button onClick={()=> onEdit && onEdit(t)}>Editar</button>
                <button onClick={()=> { if(window.confirm('Eliminar transacción?')) onDelete && onDelete(t.id) }} style={{marginLeft:8}}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
