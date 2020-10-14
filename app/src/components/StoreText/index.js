import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { nanoid } from '@reduxjs/toolkit'
import { addItem, addDefault } from '../../reducers/storedData'

import './index.css';

export const StoreText = () => {
  // Init state
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
          Print text button
        </button>
      </form>
    </section>
  )
}
