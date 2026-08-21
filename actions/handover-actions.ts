'use server'

import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/mongodb'
import { uploadPhoto, deletePhoto } from '@/lib/gridfs'
import { handoverSchema, PHOTO_KEYS } from '@/lib/validation'
import { ObjectId } from 'mongodb'

const MAX_PHOTO_SIZE = (parseInt(process.env.MAX_PHOTO_SIZE_MB || '2') || 2) * 1024 * 1024

const CHECKLIST_KEYS = [
  'oleo_motor',
  'arrefecimento',
  'pneus',
  'partida_motor',
  'freios',
  'identificacao_visual',
  'limpeza',
] as const

export async function submitHandoverAction(formData: FormData) {
  try {
    const plate = (formData.get('plate') as string || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()

    const raw = {
      plate,
      officer: {
        patente: formData.get('officer_patente'),
        nome: formData.get('officer_nome'),
        matricula: formData.get('officer_matricula'),
      },
      deliveringOfficer: {
        patente: formData.get('delivered_patente'),
        nome: formData.get('delivered_nome'),
        matricula: formData.get('delivered_matricula'),
      },
      receivingOfficer: {
        patente: formData.get('received_patente'),
        nome: formData.get('received_nome'),
        matricula: formData.get('received_matricula'),
      },
      kilometers: {
        initial: formData.get('km_initial'),
        final: formData.get('km_final'),
      },
      checklist: {} as Record<string, 'ok' | 'alteracao'>,
      checklistObservations: {} as Record<string, string>,
      observations: formData.get('observations'),
    }

    for (const item of CHECKLIST_KEYS) {
      const status = formData.get(`check_${item}`)
      if (status !== 'ok' && status !== 'alteracao') {
        return { error: `Status inválido para o item ${item}` }
      }
      raw.checklist[item] = status
      if (status === 'alteracao') {
        raw.checklistObservations[item] = (formData.get(`obs_${item}`) as string || '').trim()
      }
    }

    const parsed = handoverSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Dados inválidos' }
    }

    // Fotos: upload para GridFS
    const photoIds: Record<string, string> = {}
    for (const { key } of PHOTO_KEYS) {
      const file = formData.get(`photo_${key}`) as File | null
      if (!file || !file.size) return { error: `Foto "${key}" é obrigatória` }

      if (file.size > MAX_PHOTO_SIZE) {
        return { error: `Foto "${key}" excede o tamanho máximo de ${MAX_PHOTO_SIZE / 1024 / 1024}MB` }
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const id = await uploadPhoto(buffer, `${plate}_${key}.jpg`, file.type || 'image/jpeg')
      photoIds[key] = id
    }

    const { db } = await connectToDatabase()
    const now = new Date()
    const result = await db.collection('handovers').insertOne({
      ...parsed.data,
      checklistObservations: parsed.data.checklistObservations || {},
      photos: photoIds,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath('/admin')
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error('Erro ao salvar carga de viatura:', error)
    return { error: 'Erro ao salvar. Tente novamente.' }
  }
}

export async function getHandoversAction(query = '') {
  try {
    const { db } = await connectToDatabase()
    const filter = query
      ? {
          $or: [
            { plate: { $regex: query, $options: 'i' } },
            { 'officer.nome': { $regex: query, $options: 'i' } },
          ],
        }
      : {}
    const docs = await db
      .collection('handovers')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()

    return {
      success: true,
      records: docs.map((d) => ({
        _id: d._id.toString(),
        plate: d.plate,
        officer: d.officer,
        kilometers: d.kilometers,
        createdAt: d.createdAt,
        hasAlteration: Object.values(d.checklist).includes('alteracao'),
      })),
    }
  } catch (error) {
    console.error('Erro ao listar registros:', error)
    return { error: 'Erro ao listar registros' }
  }
}

export async function getHandoverByIdAction(id: string) {
  try {
    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }
    const { db } = await connectToDatabase()
    const doc = await db.collection('handovers').findOne({ _id: new ObjectId(id) })
    if (!doc) return { error: 'Registro não encontrado' }
    return { success: true, record: { ...doc, _id: doc._id.toString() } }
  } catch (error) {
    console.error('Erro ao buscar registro:', error)
    return { error: 'Erro ao buscar registro' }
  }
}

export async function deleteHandoverAction(id: string) {
  try {
    if (!ObjectId.isValid(id)) return { error: 'ID inválido' }
    const { db } = await connectToDatabase()
    const doc = await db.collection('handovers').findOne({ _id: new ObjectId(id) })
    if (!doc) return { error: 'Registro não encontrado' }

    for (const { key } of PHOTO_KEYS) {
      const pid = doc.photos?.[key]
      if (pid) await deletePhoto(pid)
    }

    await db.collection('handovers').deleteOne({ _id: new ObjectId(id) })
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir registro:', error)
    return { error: 'Erro ao excluir registro' }
  }
}