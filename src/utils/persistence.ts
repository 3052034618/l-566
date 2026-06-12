const STORAGE_KEY = 'police_command_system_data'

export interface PersistedData {
  incidents: any[]
  vehicles: any[]
  officers: any[]
  cameras: any[]
  cases: any[]
  schedules: any[]
  alerts: any[]
  assignments: any[]
  cameraAlertLogs: any[]
  savedAt: string
}

export function saveToStorage(data: Partial<PersistedData>) {
  try {
    const existing = loadFromStorage() || {}
    const toSave = {
      ...existing,
      ...data,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    return true
  } catch (e) {
    console.error('Failed to save to localStorage:', e)
    return false
  }
}

export function loadFromStorage(): PersistedData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load from localStorage:', e)
    return null
  }
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasPersistedData(): boolean {
  return !!localStorage.getItem(STORAGE_KEY)
}

export function saveFileToIndexedDB(file: File): Promise<{ id: string; name: string; type: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const fileData = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result,
        lastModified: file.lastModified
      }
      try {
        const files = JSON.parse(localStorage.getItem('police_files') || '{}')
        files[id] = fileData
        localStorage.setItem('police_files', JSON.stringify(files))
        resolve({ id, name: file.name, type: file.type, size: file.size })
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getFileFromIndexedDB(id: string): any | null {
  try {
    const files = JSON.parse(localStorage.getItem('police_files') || '{}')
    return files[id] || null
  } catch (e) {
    return null
  }
}

export function playAlertSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playBeep = (freq: number, duration: number, startTime: number) => {
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration)
      oscillator.start(audioCtx.currentTime + startTime)
      oscillator.stop(audioCtx.currentTime + startTime + duration)
    }
    playBeep(880, 0.15, 0)
    playBeep(660, 0.15, 0.2)
    playBeep(880, 0.15, 0.4)
    playBeep(660, 0.15, 0.6)
    return true
  } catch (e) {
    console.error('Failed to play alert sound:', e)
    return false
  }
}
