import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { nanoid } from '@reduxjs/toolkit'
import { addItem, addDefault } from '../../features/StoredDataSlice'

import './index.css';

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
        <label>Store some data in state:</label>
        <input
          type="text"
          value={value}
          onChange={onInputChanged}
        />
        <button type="button"
          onClick={onSavePostClicked}
        >
          Store
        </button>
        <button type="button"
          onClick={onDefaultClicked}
        >
          Default
        </button>
      </form>
    </section>
  )
}
