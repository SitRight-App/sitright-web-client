// src/shared/api/client.test.ts
import { describe, expect, it } from 'vitest'
import { apiErrorMessage } from './client'

describe('apiErrorMessage', () => {
  it('extrae el detail de un cuerpo JSON', () => {
    const err = new Error('API 400: {"detail":"La estatura debe estar entre 100 y 250 cm"}')
    expect(apiErrorMessage(err)).toBe('La estatura debe estar entre 100 y 250 cm')
  })

  it('devuelve el cuerpo tal cual si no es JSON', () => {
    const err = new Error('API 500: Internal Server Error')
    expect(apiErrorMessage(err)).toBe('Internal Server Error')
  })

  it('devuelve el fallback si el valor no es un Error', () => {
    expect(apiErrorMessage('algo raro')).toBe('Ocurrió un error. Intenta de nuevo.')
  })
})
