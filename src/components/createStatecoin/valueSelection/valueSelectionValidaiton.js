import React from 'react';

export default function validate(values) {
  let errors = {};
  if (!values.customInput) {
    errors.customInput = 'customInput is required';
  }
  return errors;
};