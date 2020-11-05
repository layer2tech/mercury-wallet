import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { nanoid } from '@reduxjs/toolkit'
import { addItem, addDefault } from '../../features/StoredDataSlice'

import './storedData.css';

export const StoredData = () => {
  const [value, setValue] = useState('')

  const onInputChanged = e => {
    setValue(e.target.value);
  }

  const dispatch = useDispatch()

  const onSavePostClicked = () => {
    if (value) {
      dispatch(
        addItem({
          id: nanoid(),
          data: value,
        })
      )
      setValue('')
    }
  }

  const onDefaultClicked = () => {
    dispatch(addDefault())
  }

  return (
    <section>
      <form>
        <label>Store data in state:</label>
        <input
          type="text"
          value={value}
          onChange={onInputChanged}
        />
        <button type="button"
          onClick={onSavePostClicked}
          className="StoredData-button"
        >
          Store
        </button>
        <button type="button"
          onClick={onDefaultClicked}
          className="StoredData-button"
        >
          Default
        </button>
      </form>
    </section>
  )
}

export default StoredData;
