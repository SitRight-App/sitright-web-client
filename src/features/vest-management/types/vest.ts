export interface VestDevice {
  id: string
  mac_address: string
  user_id: string | null
  firmware_version: string | null
  battery_level: number | null
  is_active: boolean
  is_calibrated: boolean
  is_linked: boolean
  linked_at: string | null
  /** ISO-8601 de la última calibración exitosa. `null` si nunca se calibró. */
  calibrated_at?: string | null
  created_at: string
}

export interface LinkVestRequest {
  mac_address: string
  pairing_code: string
}

export interface LinkVestResponse {
  vest: VestDevice
  mqtt_username: string
  mqtt_password: string
}

export interface SensorReference {
  ax: number
  ay: number
  az: number
}

export interface CalibrateVestRequest {
  cervical: SensorReference
  dorsal: SensorReference
  lumbar: SensorReference
}
