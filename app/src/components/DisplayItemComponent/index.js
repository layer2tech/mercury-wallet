import React from 'react'
import { useSelector } from 'react-redux'

export const DisplayItemComponent = () => {
  const storedData = useSelector(state => state.storedData)

  const printStoredData = storedData.map(item => (
    <article key={item.id}>
      <h3>{item.data}</h3>
    </article>
  ))

  return (
    <section>
      <h2>Items stored in State: </h2>
      {printStoredData}
    </section>
  )
}
