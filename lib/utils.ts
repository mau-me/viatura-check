import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1200
      let { width, height } = img

      if (width > height && width > MAX) {
        height = Math.round((height * MAX) / width)
        width = MAX
      } else if (height > MAX) {
        width = Math.round((width * MAX) / height)
        height = MAX
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D não disponível')); return }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Falha ao comprimir imagem')); return }
          const compressed = new File([blob], file.name, { type: 'image/jpeg' })
          URL.revokeObjectURL(url)
          resolve(compressed)
        },
        'image/jpeg',
        0.8
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')) }
    img.src = url
  })
}
